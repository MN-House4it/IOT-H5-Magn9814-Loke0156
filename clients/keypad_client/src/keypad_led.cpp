#include "keypad_led.h"
#include "config.h"
#include "device_id.h"
#include <ArduinoJson.h>

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
static uint32_t doorOpenTimestamp = 0;
static bool doorOpenActive = false;

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

void keypadLedInit()
{
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
}

void keypadLedRedBlink(uint32_t durationMs)
{
  startBlink(redLed, durationMs);
}

void keypadLedGreenBlink(uint32_t durationMs)
{
  startBlink(greenLed, durationMs);
}

void keypadLedRedGlow(uint32_t durationMs)
{
  startGlow(redLed, durationMs);
}

void keypadLedGreenGlow(uint32_t durationMs)
{
  startGlow(greenLed, durationMs);
}

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

void keypadLedLoop()
{
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
        keypadLedRedGlow(LED_GLOW_DURATION_MS);
      }
    }
  }
}

void keypadLedHandleMqtt(char *topic, byte *payload, unsigned int length)
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
      keypadLedRedOff();
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
    keypadLedRedBlink(timeMs);
    keypadSetInputEnabled(false);
  }
  else if (state == "AwaitingPassword")
  {
    // Stop any red blinking/error indicator when awaiting a new password
    keypadLedRedOff();

    keypadLedGreenBlink(timeMs);
    keypadSetInputEnabled(true);
    keypadClearBuffer();
    Serial.println("Keypad input ENABLED");
  }
  else if (state == "AccessGranted")
  {
    keypadLedGreenGlow(timeMs);
    keypadSetInputEnabled(false);
  }
}

void keypadLedSetDoorOpen(bool isOpen)
{
  doorOpenActive = isOpen;
  if (isOpen)
  {
    doorOpenTimestamp = millis();
  }
}

bool keypadLedGetDoorOpen()
{
  return doorOpenActive;
}
