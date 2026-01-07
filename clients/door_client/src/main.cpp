#include <Arduino.h>
#include <ArduinoUniqueID.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#include "config.h"

// --- MQTT ---
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// --- LED State ---
static uint32_t ledEndTimeMs = 0; // When LED should turn off
static bool ledActive = false;    // Current LED state

// --- Button State ---
static bool buttonPressed = false;    // Current button state
static bool doorActionActive = false; // Whether door action was initiated

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

static void setLED(bool on)
{
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

static void turnOffLED()
{
  setLED(false);
  ledActive = false;
}

static void handleButtonPress()
{
  bool buttonCurrentlyPressed = digitalRead(BUTTON_PIN) == LOW; // LOW = pressed (active low)

  // Button press detected
  if (buttonCurrentlyPressed && !buttonPressed)
  {
    Serial.println("Button pressed - publishing 'close' to door/action");
    mqtt.publish(MQTT_TOPIC_ACTION, "close", false);
    doorActionActive = true;
    buttonPressed = true;
  }
  // Button release detected
  else if (!buttonCurrentlyPressed && buttonPressed)
  {
    Serial.println("Button released - publishing 'open' to door/action");
    mqtt.publish(MQTT_TOPIC_ACTION, "open", false);
    doorActionActive = false;
    buttonPressed = false;
  }
}

static void mqttMessageCallback(char *topic, byte *payload, unsigned int length)
{
  String deviceName = getUniqueID();

  Serial.print("MQTT message received on topic: ");
  Serial.println(topic);

  // Parse JSON payload
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error)
  {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract deviceId and time from payload
  if (!doc.containsKey("deviceId") || !doc.containsKey("time"))
  {
    Serial.println("Missing required fields: deviceId, time");
    return;
  }

  String incomingDeviceId = doc["deviceId"].as<String>();
  uint32_t durationMs = doc["time"].as<uint32_t>();

  Serial.print("Incoming deviceId: ");
  Serial.println(incomingDeviceId);
  Serial.print("Duration (ms): ");
  Serial.println(durationMs);

  // Check if device ID matches
  if (incomingDeviceId == deviceName)
  {
    Serial.println("Device ID match! Turning on LED...");
    setLED(true);
    ledActive = true;
    ledEndTimeMs = millis() + durationMs;
  }
  else
  {
    Serial.print("Device ID mismatch. Expected: ");
    Serial.print(deviceName);
    Serial.print(", got: ");
    Serial.println(incomingDeviceId);
  }
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

      // Subscribe to control topic
      if (mqtt.subscribe(MQTT_TOPIC_CONTROL))
      {
        Serial.print("Subscribed to: ");
        Serial.println(MQTT_TOPIC_CONTROL);
      }
      else
      {
        Serial.println("Failed to subscribe");
      }
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

void setup()
{
  Serial.begin(115200);
  while (!Serial)
  {
    delay(10);
  }

  // Setup LED pin as output
  pinMode(LED_PIN, OUTPUT);
  setLED(false); // Start with LED off

  // Setup Button pin as input with pull-up
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttMessageCallback);

  ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device name: ");
  Serial.println(deviceName);

  ensureMQTT(deviceName);

  Serial.println("RGB LED controller ready. Listening for MQTT messages...");
}

void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqtt.loop();

  // Handle button press/release
  handleButtonPress();

  // Check if LED should turn off
  if (ledActive)
  {
    uint32_t now = millis();
    if (now >= ledEndTimeMs)
    {
      Serial.println("LED timeout reached. Turning off...");
      turnOffLED();
    }
  }

  delay(50);
}
