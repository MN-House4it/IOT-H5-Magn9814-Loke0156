#include "keypad_led.h"
#include "config.h"
#include "device_id.h"
#include <ArduinoJson.h>

// --- LED control modes ---
enum LedMode
{
  LED_IDLE,     // LED off
  LED_BLINKING, // LED blinking
  LED_GLOWING   // LED solid ON for duration
};

// Structure describing LED state machine
struct LedControl
{
  uint8_t pin;
  LedMode mode;
  bool state;
  uint32_t lastToggleMs;
  uint32_t endTimeMs;
};

// LED instances
static LedControl redLed = {RED_LED_PIN, LED_IDLE, false, 0, 0};
static LedControl greenLed = {GREEN_LED_PIN, LED_IDLE, false, 0, 0};

// Door open tracking
static uint32_t doorOpenTimestamp = 0;
static bool doorOpenActive = false;

// Start blinking an LED for a given duration
static void startBlink(LedControl &led, uint32_t durationMs)
{
  led.mode = LED_BLINKING;
  led.state = false;
  led.lastToggleMs = millis();
  led.endTimeMs = millis() + durationMs;
  digitalWrite(led.pin, LOW);
}

// Start glowing (solid ON) an LED for a given duration
static void startGlow(LedControl &led, uint32_t durationMs)
{
  led.mode = LED_GLOWING;
  led.endTimeMs = millis() + durationMs;
  digitalWrite(led.pin, HIGH);
}

// Update LED state machine
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

// Initialize LED GPIO pins
void keypadLedInit()
{
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
}

// Public LED control helpers
void keypadLedRedBlink(uint32_t durationMs) { startBlink(redLed, durationMs); }
void keypadLedGreenBlink(uint32_t durationMs) { startBlink(greenLed, durationMs); }
void keypadLedRedGlow(uint32_t durationMs) { startGlow(redLed, durationMs); }
void keypadLedGreenGlow(uint32_t durationMs) { startGlow(greenLed, durationMs); }

void keypadLedRedOff()
{
  redLed.mode = LED_IDLE;
  digitalWrite(RED_LED_PIN, LOW);
}

void keypadLedGreenOff()
{
  greenLed.mode = LED_IDLE;
  digitalWrite(GREEN_LED_PIN, LOW);
}

// Main LED update loop
void keypadLedLoop()
{
  updateLed(redLed);
  updateLed(greenLed);

  // Check for door left open too long
  if (doorOpenActive)
  {
    uint32_t now = millis();
    if (now - doorOpenTimestamp > LED_GLOW_DURATION_MS)
    {
      if (redLed.mode != LED_GLOWING)
      {
        DEBUG_PRINTLN("Door not closed within 15s! Red LED ON");
        keypadLedRedGlow(LED_GLOW_DURATION_MS);
      }
    }
  }
}

// Handle incoming MQTT messages affecting LEDs and keypad state
void keypadLedHandleMqtt(char *topic, byte *payload, unsigned int length)
{
  // --- Door lock action handling ---
  if (String(topic) == MQTT_TOPIC_ACTION)
  {
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, payload, length))
    {
      DEBUG_PRINTLN("Invalid JSON on doorlock/action");
      return;
    }

    String incomingId = doc["deviceId"] | "";
    String action = doc["action"] | "";

    if (incomingId != DOOR_DEVICE_ID)
      return;

    if (action == "open")
    {
      DEBUG_PRINTLN("Door open received");
      doorOpenTimestamp = millis();
      doorOpenActive = true;
    }
    else if (action == "close")
    {
      DEBUG_PRINTLN("Door close received");
      doorOpenActive = false;
      keypadLedRedOff();
    }

    return; // Stop further processing
  }

  // --- Keypad state handling ---
  if (String(topic) != MQTT_TOPIC_STATE)
    return;

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length))
  {
    DEBUG_PRINTLN("Invalid JSON received");
    return;
  }

  String deviceName = getUniqueID();
  String incomingId = doc["deviceId"] | "";
  String state = doc["state"] | "";
  uint32_t timeMs = doc["time"] | 3000;

  if (incomingId != deviceName)
    return;

  DEBUG_PRINT("State received: ");
  DEBUG_PRINTLN(state);

  if (state == "IncorrectKeycard" || state == "IncorrectPassword")
  {
    keypadLedRedBlink(timeMs);
    keypadSetInputEnabled(false);
  }
  else if (state == "AwaitingPassword")
  {
    keypadLedRedOff();
    keypadLedGreenBlink(timeMs);
    keypadSetInputEnabled(true);
    keypadClearBuffer();
    DEBUG_PRINTLN("Keypad input ENABLED");
  }
  else if (state == "AccessGranted")
  {
    keypadLedGreenGlow(timeMs);
    keypadSetInputEnabled(false);
  }
}

// Manually set door open state
void keypadLedSetDoorOpen(bool isOpen)
{
  doorOpenActive = isOpen;
  if (isOpen)
    doorOpenTimestamp = millis();
}

// Get current door open state
bool keypadLedGetDoorOpen()
{
  return doorOpenActive;
}
