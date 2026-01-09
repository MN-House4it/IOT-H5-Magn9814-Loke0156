#include "led_button.h"
#include "config.h"
#include "device_id.h"
#include "payloads.h"
#include "net_mqtt.h"
#include <ArduinoJson.h>

// LED state
static uint32_t ledEndTimeMs = 0;
static bool ledActive = false;

// Button state
static bool buttonPressed = false;
static bool doorActionActive = false;

void setLED(bool on)
{
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

void turnOffLED()
{
  setLED(false);
  ledActive = false;
}

void handleButtonPress()
{
  bool buttonCurrentlyPressed = digitalRead(BUTTON_PIN) == LOW;

  String deviceName = getUniqueID();

  if (buttonCurrentlyPressed && !buttonPressed)
  {
    Serial.println("Button pressed - publishing 'close' to door/action");
    String payload = buildDoorActionJson(deviceName, "close");
    mqttPublish(MQTT_TOPIC_ACTION, payload.c_str(), false);
    doorActionActive = true;
    buttonPressed = true;
  }
  else if (!buttonCurrentlyPressed && buttonPressed)
  {
    Serial.println("Button released - publishing 'open' to door/action");
    String payload = buildDoorActionJson(deviceName, "open");
    mqttPublish(MQTT_TOPIC_ACTION, payload.c_str(), false);
    doorActionActive = false;
    buttonPressed = false;
  }
}

void ledHandleMqtt(char *topic, byte *payload, unsigned int length)
{
  String deviceName = getUniqueID();

  Serial.print("MQTT message received on topic: ");
  Serial.println(topic);

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error)
  {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

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

void ledLoop()
{
  if (ledActive)
  {
    uint32_t now = millis();
    if (now >= ledEndTimeMs)
    {
      Serial.println("LED timeout reached. Turning off...");
      turnOffLED();
    }
  }
}
