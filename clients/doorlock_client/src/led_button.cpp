#include "led_button.h"
#include "config.h"
#include "device_id.h"
#include "payloads.h"
#include "net_mqtt.h"
#include <ArduinoJson.h>

// LED control state tracking
static uint32_t ledEndTimeMs = 0;
static bool ledActive = false;

// Button state tracking for press/release detection
static bool buttonPressed = false;
static bool doorActionActive = false;

// Set LED output state
void setLED(bool on)
{
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

// Turn off LED and update state
void turnOffLED()
{
  setLED(false);
  ledActive = false;
}

// Handle physical button press and release events
void handleButtonPress()
{
  bool buttonCurrentlyPressed = digitalRead(BUTTON_PIN) == LOW;

  String deviceName = getUniqueID();

  // Detect button press transition (not pressed -> pressed)
  if (buttonCurrentlyPressed && !buttonPressed)
  {
    DEBUG_PRINTLN("Button pressed - publishing 'close' to door/action");
    String payload = buildDoorActionJson(deviceName, "close");
    mqttPublish(MQTT_TOPIC_ACTION, payload.c_str(), false);
    doorActionActive = true;
    buttonPressed = true;
  }
  // Detect button release transition (pressed -> not pressed)
  else if (!buttonCurrentlyPressed && buttonPressed)
  {
    DEBUG_PRINTLN("Button released - publishing 'open' to door/action");
    String payload = buildDoorActionJson(deviceName, "open");
    mqttPublish(MQTT_TOPIC_ACTION, payload.c_str(), false);
    doorActionActive = false;
    buttonPressed = false;
  }
}

// Handle incoming MQTT messages for LED control
void ledHandleMqtt(char *topic, byte *payload, unsigned int length)
{
  String deviceName = getUniqueID();

  DEBUG_PRINT("MQTT message received on topic: ");
  DEBUG_PRINTLN(topic);

  // Parse JSON payload
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error)
  {
    DEBUG_PRINT("JSON parse error: ");
    DEBUG_PRINTLN(error.c_str());
    return;
  }

  // Validate required fields
  if (!doc.containsKey("deviceId") || !doc.containsKey("time"))
  {
    DEBUG_PRINTLN("Missing required fields: deviceId, time");
    return;
  }

  // Extract device ID and LED duration from payload
  String incomingDeviceId = doc["deviceId"].as<String>();
  uint32_t durationMs = doc["time"].as<uint32_t>();

  DEBUG_PRINT("Incoming deviceId: ");
  DEBUG_PRINTLN(incomingDeviceId);
  DEBUG_PRINT("Duration (ms): ");
  DEBUG_PRINTLN(durationMs);

  // Check if message is intended for this device
  if (incomingDeviceId == deviceName)
  {
    DEBUG_PRINTLN("Device ID match! Turning on LED...");
    setLED(true);
    ledActive = true;
    ledEndTimeMs = millis() + durationMs;
  }
  else
  {
    DEBUG_PRINT("Device ID mismatch. Expected: ");
    DEBUG_PRINT(deviceName);
    DEBUG_PRINT(", got: ");
    DEBUG_PRINTLN(incomingDeviceId);
  }
}

// Update LED state based on timing
void ledLoop()
{
  if (ledActive)
  {
    // Check if LED timeout has been reached
    uint32_t now = millis();
    if (now >= ledEndTimeMs)
    {
      DEBUG_PRINTLN("LED timeout reached. Turning off...");
      turnOffLED();
    }
  }
}
