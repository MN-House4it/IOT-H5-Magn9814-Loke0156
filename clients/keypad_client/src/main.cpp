#include <Arduino.h>
#include <ArduinoUniqueID.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#include "config.h"

// --- Keypad pins ---
static const uint8_t rowPins[4] = {2, 3, 4, 5};
static const uint8_t colPins[4] = {6, 7, 8, 9};

// Key layout
static const char keymap[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'0', 'F', 'E', 'D'}};

// --- MQTT ---
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// --- Keypad ---
static char lastKey = 0;
static uint32_t lastChangeMs = 0;
static const uint32_t debounceMs = 40;
static String keyBuffer = "";
static bool inputEnabled = false;

// --- Doorlock monitoring ---
static uint32_t doorOpenTimestamp = 0; // Time when "open" received
static bool doorOpenActive = false;    // Currently waiting for "close"

// --- LED control ---
enum LedMode
{
  LED_IDLE,
  LED_BLINKING,
  LED_GLOWING
};

struct LedControl
{
  uint8_t pin;
  LedMode mode;
  bool state;
  uint32_t lastToggleMs;
  uint32_t endTimeMs;
};

static LedControl redLed = {RED_LED_PIN, LED_IDLE, false, 0, 0};
static LedControl greenLed = {GREEN_LED_PIN, LED_IDLE, false, 0, 0};

// ---------------- Helpers ----------------

// ---------------- Base64 encoding ----------------
static const char base64Table[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static String base64Encode(const String &input)
{
  String output;
  int val = 0;
  int valb = -6;

  for (uint8_t c : input)
  {
    val = (val << 8) + c;
    valb += 8;
    while (valb >= 0)
    {
      output += base64Table[(val >> valb) & 0x3F];
      valb -= 6;
    }
  }

  if (valb > -6)
  {
    output += base64Table[((val << 8) >> (valb + 8)) & 0x3F];
  }

  while (output.length() % 4)
  {
    output += '=';
  }

  return output;
}

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

// ---------------- WiFi ----------------
static void ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  if (WiFi.status() == WL_NO_MODULE)
    Serial.println("WiFi module not found.");

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

// ---------------- MQTT ----------------
static String buildStatusJson(const String &deviceId, const String &status)
{
  return "{\"deviceId\":\"" + deviceId + "\",\"status\":\"" + status + "\"}";
}

static String buildKeyJson(const String &deviceId, const String &input)
{
  return "{\"deviceId\":\"" + deviceId + "\",\"input\":\"" + input + "\"}";
}

static void ensureMQTT(const String &deviceName)
{
  while (!mqtt.connected())
  {
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(deviceName);
    Serial.print(" ... ");

    bool ok = mqttHasAuth()
                  ? mqtt.connect(deviceName.c_str(), MQTT_USER, MQTT_PASS)
                  : mqtt.connect(deviceName.c_str());

    if (ok)
    {
      Serial.println("connected!");
      mqtt.publish(MQTT_TOPIC_STATUS,
                   buildStatusJson(deviceName, "online").c_str(),
                   true);

      mqtt.subscribe(MQTT_TOPIC_STATE);
      Serial.print("Subscribed to ");
      Serial.println(MQTT_TOPIC_STATE);
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

// ---------------- LED logic ----------------
static void startBlink(LedControl &led, uint32_t durationMs)
{
  led.mode = LED_BLINKING;
  led.state = false;
  led.lastToggleMs = millis();
  led.endTimeMs = millis() + durationMs;
  digitalWrite(led.pin, LOW);
}

static void startGlow(LedControl &led, uint32_t durationMs)
{
  led.mode = LED_GLOWING;
  led.endTimeMs = millis() + durationMs;
  digitalWrite(led.pin, HIGH);
}

static void updateLed(LedControl &led)
{
  uint32_t now = millis();

  if (led.mode == LED_BLINKING)
  {
    if (now >= led.endTimeMs)
    {
      led.mode = LED_IDLE;
      digitalWrite(led.pin, LOW);
      return;
    }

    if (now - led.lastToggleMs >= LED_BLINK_INTERVAL_MS)
    {
      led.lastToggleMs = now;
      led.state = !led.state;
      digitalWrite(led.pin, led.state ? HIGH : LOW);
    }
  }
  else if (led.mode == LED_GLOWING)
  {
    if (now >= led.endTimeMs)
    {
      led.mode = LED_IDLE;
      digitalWrite(led.pin, LOW);
    }
  }
}

// ---------------- MQTT callback ----------------
static void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  // --- Doorlock handling ---
  if (String(topic) == "doorlock/action")
  {
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, payload, length))
    {
      Serial.println("Invalid JSON on doorlock/action");
      return;
    }

    String incomingId = doc["deviceId"] | "";
    String action = doc["action"] | "";

    if (incomingId != DOOR_DEVICE_ID)
      return; // Ignore messages for other doors

    if (action == "open")
    {
      Serial.println("Door open received");
      doorOpenTimestamp = millis();
      doorOpenActive = true;
    }
    else if (action == "close")
    {
      Serial.println("Door close received");
      doorOpenActive = false;
      redLed.mode = LED_IDLE; // Stop red glow
      digitalWrite(RED_LED_PIN, LOW);
    }

    return; // Do not continue with keypad/state logic for doorlock messages
  }

  if (String(topic) != MQTT_TOPIC_STATE)
    return;

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length))
  {
    Serial.println("Invalid JSON received");
    return;
  }

  String deviceName = getUniqueID();
  String incomingId = doc["deviceId"] | "";
  String state = doc["state"] | "";
  uint32_t timeMs = doc["time"] | 3000;

  if (incomingId != deviceName)
    return;

  Serial.print("State received: ");
  Serial.println(state);

  if (state == "IncorrectKeycard" || state == "IncorrectPassword")
  {
    startBlink(redLed, timeMs);
    inputEnabled = false;
  }
  else if (state == "AwaitingPassword")
  {
    startBlink(greenLed, timeMs);
    inputEnabled = true;
    keyBuffer = "";
    Serial.println("Keypad input ENABLED");
  }
  else if (state == "AccessGranted")
  {
    startGlow(greenLed, timeMs);
    inputEnabled = false;
  }
}

// ---------------- Keypad scan ----------------
char scanKeypad()
{
  for (uint8_t r = 0; r < 4; r++)
  {
    for (uint8_t rr = 0; rr < 4; rr++)
      digitalWrite(rowPins[rr], HIGH);

    digitalWrite(rowPins[r], LOW);
    delayMicroseconds(5);

    for (uint8_t c = 0; c < 4; c++)
      if (digitalRead(colPins[c]) == LOW)
        return keymap[r][c];
  }
  return 0;
}

// ---------------- Setup ----------------
void setup()
{
  Serial.begin(115200);
  while (!Serial)
    delay(10);

  for (uint8_t r = 0; r < 4; r++)
  {
    pinMode(rowPins[r], OUTPUT);
    digitalWrite(rowPins[r], HIGH);
  }

  for (uint8_t c = 0; c < 4; c++)
    pinMode(colPins[c], INPUT_PULLUP);

  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);

  ensureWiFi();
  ensureMQTT(getUniqueID());

  mqtt.subscribe("doorlock/action");
  Serial.println("Subscribed to doorlock/action");

  Serial.println("Keypad client ready");
}

// ---------------- Loop ----------------
void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqtt.loop();

  updateLed(redLed);
  updateLed(greenLed);

  // Check for door open timeout
  if (doorOpenActive)
  {
    uint32_t now = millis();
    if (now - doorOpenTimestamp > LED_GLOW_DURATION_MS) // 15s timeout
    {
      if (redLed.mode != LED_GLOWING)
      {
        Serial.println("Door not closed within 15s! Red LED ON");
        redLed.mode = LED_GLOWING;
        digitalWrite(RED_LED_PIN, HIGH);
      }
    }
  }

  char k = scanKeypad();
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

      if (!inputEnabled)
      {
        Serial.println("Input ignored (not awaiting password)");
        return;
      }

      if (k == 'E')
      {
        if (keyBuffer.length())
        {
          String encodedPassword = base64Encode(keyBuffer);

          mqtt.publish(MQTT_TOPIC_KEY,
                       buildKeyJson(deviceName, encodedPassword).c_str(),
                       true);

          Serial.print("Encoded password sent: ");
          Serial.println(encodedPassword);

          Serial.println("Password submitted, waiting for server response");

          // Disable input until next MQTT state
          inputEnabled = false;
          keyBuffer = "";

          // Stop any blinking LEDs immediately
          redLed.mode = LED_IDLE;
          greenLed.mode = LED_IDLE;
          digitalWrite(RED_LED_PIN, LOW);
          digitalWrite(GREEN_LED_PIN, LOW);
        }
      }

      else if (k == 'D' && keyBuffer.length())
      {
        keyBuffer.remove(keyBuffer.length() - 1);
      }
      else if (k == 'C')
      {
        keyBuffer = "";
      }
      else
      {
        // Ignore A, B, F
        if (k == 'A' || k == 'B' || k == 'F')
        {
          Serial.print("Key ignored: ");
          Serial.println(k);
        }
        else
        {
          keyBuffer += k;
          Serial.print("Buffer: ");
          Serial.println(keyBuffer);
        }
      }
    }

    if (k == 0)
      reported = 0;
  }

  delay(5);
}
