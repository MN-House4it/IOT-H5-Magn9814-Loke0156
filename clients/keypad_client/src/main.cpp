#include <Arduino.h>
#include <ArduinoUniqueID.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

#include "config.h"

// --- Pin mapping (adjust to match your wiring) ---
static const uint8_t rowPins[4] = {2, 3, 4, 5}; // ROW1..ROW4
static const uint8_t colPins[4] = {6, 7, 8, 9}; // COL1..COL4

// Key layout (change to your preferred mapping)
static const char keymap[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'0', 'F', 'E', 'D'}};

// --- MQTT ---
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// --- Keypad State ---
static char lastKey = 0;
static uint32_t lastChangeMs = 0;
static const uint32_t debounceMs = 40;
static String keyBuffer = ""; // Accumulate typed characters

// --- Helper Functions ---
static bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

static String getUniqueID()
{
  String id = "";
  for (size_t i = 0; i < UniqueIDsize; i++)
  {
    if (UniqueID[i] < 0x10)
      id += "0";
    id += String(UniqueID[i], HEX);
  }
  id.toUpperCase();
  return id;
}

static void ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  if (WiFi.status() == WL_NO_MODULE)
  {
    Serial.println("WiFi module not found. Check WiFiNINA module/firmware.");
  }

  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(WIFI_SSID);

  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

static String buildJsonPayload(const String &deviceId, const String &input)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n  \"input\": \"";
  json += input;
  json += "\"\n}";
  return json;
}

static String buildStatusJson(const String &deviceId, const String &status)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n  \"status\": \"";
  json += status;
  json += "\"\n}";
  return json;
}

static void ensureMQTT(const String &deviceName)
{
  while (!mqtt.connected())
  {
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(deviceName);
    Serial.print(" ... ");

    bool ok = false;
    if (mqttHasAuth())
    {
      ok = mqtt.connect(deviceName.c_str(), MQTT_USER, MQTT_PASS);
    }
    else
    {
      ok = mqtt.connect(deviceName.c_str());
    }

    if (ok)
    {
      Serial.println("connected!");
      String statusPayload = buildStatusJson(deviceName, "online");
      mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

char scanKeypad()
{
  // Columns are inputs with pullups (idle HIGH)
  // Rows are driven one-at-a-time LOW to detect a press.
  for (uint8_t r = 0; r < 4; r++)
  {
    // Set all rows HIGH first (inactive)
    for (uint8_t rr = 0; rr < 4; rr++)
    {
      digitalWrite(rowPins[rr], HIGH);
    }

    // Drive current row LOW
    digitalWrite(rowPins[r], LOW);
    delayMicroseconds(5); // settle time

    // Read columns: pressed key will pull column LOW
    for (uint8_t c = 0; c < 4; c++)
    {
      if (digitalRead(colPins[c]) == LOW)
      {
        return keymap[r][c];
      }
    }
  }

  return 0;
}

void setup()
{
  Serial.begin(115200);
  while (!Serial)
  {
    delay(10);
  }

  // Setup rows as outputs, default HIGH
  for (uint8_t r = 0; r < 4; r++)
  {
    pinMode(rowPins[r], OUTPUT);
    digitalWrite(rowPins[r], HIGH);
  }

  // Setup cols as inputs with pullups
  for (uint8_t c = 0; c < 4; c++)
  {
    pinMode(colPins[c], INPUT_PULLUP);
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device name: ");
  Serial.println(deviceName);

  ensureMQTT(deviceName);

  Serial.println("Keypad ready. Waiting for input...");
}

void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqtt.loop();

  char k = scanKeypad();

  // Debounce + "edge detect" (print only when a new stable key appears)
  uint32_t now = millis();

  if (k != lastKey)
  {
    lastChangeMs = now;
    lastKey = k;
  }

  if ((now - lastChangeMs) > debounceMs)
  {
    static char reported = 0;

    if (k != 0 && k != reported)
    {
      reported = k;
      Serial.print("Key: ");
      Serial.println(k);

      // Handle special keys
      if (k == 'E')
      {
        // ENTER: Send accumulated buffer
        if (keyBuffer.length() > 0)
        {
          Serial.print("Sending: ");
          Serial.println(keyBuffer);

          String payload = buildJsonPayload(deviceName, keyBuffer);
          bool ok = mqtt.publish(
              MQTT_TOPIC_KEY,
              payload.c_str(),
              MQTT_RETAIN_UID);

          Serial.print("MQTT payload: ");
          Serial.println(payload);
          Serial.print("MQTT publish ");
          Serial.println(ok ? "OK" : "FAILED");

          keyBuffer = ""; // Clear buffer after sending
        }
        else
        {
          Serial.println("Buffer is empty, nothing to send");
        }
      }
      else if (k == 'D')
      {
        // DELETE: Remove last character
        if (keyBuffer.length() > 0)
        {
          keyBuffer.remove(keyBuffer.length() - 1);
          Serial.print("Deleted. Buffer: ");
          Serial.println(keyBuffer);
        }
        else
        {
          Serial.println("Buffer is empty, nothing to delete");
        }
      }
      else if (k == 'C')
      {
        // CLEAR: Clear entire buffer
        keyBuffer = "";
        Serial.println("Buffer cleared");
      }
      else
      {
        // Regular key: Add to buffer
        keyBuffer += k;
        Serial.print("Buffer: ");
        Serial.println(keyBuffer);
      }
    }

    // Reset reported when released so it can be printed again next press
    if (k == 0 && reported != 0)
    {
      reported = 0;
    }
  }

  delay(5);
}
