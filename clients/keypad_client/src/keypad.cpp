#include "keypad.h"
#include "config.h"
#include "net_mqtt.h"
#include "device_id.h"
#include "payloads.h"
#include "keypad_led.h"

// --- Keypad pin definitions ---
// 4x4 matrix keypad: 4 rows, 4 columns
const uint8_t ROW_PINS[4] = {2, 3, 4, 5};
const uint8_t COL_PINS[4] = {6, 7, 8, 9};

// Key layout mapping rows/columns to characters
const char KEYMAP[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'0', 'F', 'E', 'D'}};

// --- Keypad state tracking ---
static char lastKey = 0;          // Last scanned key
static uint32_t lastChangeMs = 0; // Timestamp of last key change
static String keyBuffer = "";     // Collected keypad input
static bool inputEnabled = false; // Whether input is currently accepted
static const uint32_t KEYPAD_DEBOUNCE_MS = 40;

// --- Base64 encoding ---
// Used to encode keypad input before sending via MQTT
static const char base64Table[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Encode a string into Base64 format
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

  // Pad output to multiple of 4 characters
  while (output.length() % 4)
  {
    output += '=';
  }

  return output;
}

// Initialize keypad GPIO pins
void keypadInit()
{
  // Configure row pins as outputs and set HIGH (inactive)
  for (uint8_t r = 0; r < 4; r++)
  {
    pinMode(ROW_PINS[r], OUTPUT);
    digitalWrite(ROW_PINS[r], HIGH);
  }

  // Configure column pins as inputs with pull-ups
  for (uint8_t c = 0; c < 4; c++)
    pinMode(COL_PINS[c], INPUT_PULLUP);
}

// Scan keypad matrix and return pressed key (or 0 if none)
char scanKeypad()
{
  for (uint8_t r = 0; r < 4; r++)
  {
    // Set all rows inactive
    for (uint8_t rr = 0; rr < 4; rr++)
      digitalWrite(ROW_PINS[rr], HIGH);

    // Activate current row
    digitalWrite(ROW_PINS[r], LOW);
    delayMicroseconds(5);

    // Check each column for a pressed key
    for (uint8_t c = 0; c < 4; c++)
      if (digitalRead(COL_PINS[c]) == LOW)
        return KEYMAP[r][c];
  }
  return 0;
}

// Main keypad processing loop (debounce + logic)
void keypadLoop()
{
  char k = scanKeypad();
  uint32_t now = millis();

  // Detect key state change
  if (k != lastKey)
  {
    lastChangeMs = now;
    lastKey = k;
  }

  // Debounce handling
  if ((now - lastChangeMs) > KEYPAD_DEBOUNCE_MS)
  {
    static char reported = 0;

    // Process new key press
    if (k != 0 && k != reported)
    {
      reported = k;

      // Ignore input if not awaiting password
      if (!inputEnabled)
      {
        Serial.println("Input ignored (not awaiting password)");
        return;
      }

      // Special key handling
      if (k == 'E')
      {
        keypadSubmit(); // Submit password
      }
      else if (k == 'D' && keyBuffer.length())
      {
        keyBuffer.remove(keyBuffer.length() - 1); // Backspace
      }
      else if (k == 'C')
      {
        keyBuffer = ""; // Clear buffer
      }
      else
      {
        // Ignore non-numeric control keys
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

    // Reset reported key when released
    if (k == 0)
      reported = 0;
  }
}

// Enable or disable keypad input
void keypadSetInputEnabled(bool enabled)
{
  inputEnabled = enabled;
}

// Return current keypad input buffer
String keypadGetBuffer()
{
  return keyBuffer;
}

// Clear keypad input buffer
void keypadClearBuffer()
{
  keyBuffer = "";
}

// Submit keypad input via MQTT
void keypadSubmit()
{
  if (keyBuffer.length())
  {
    String deviceName = getUniqueID();
    String encodedPassword = base64Encode(keyBuffer);

    // Publish encoded password to MQTT
    mqttPublish(
        MQTT_TOPIC_KEY,
        buildKeyJson(deviceName, encodedPassword).c_str(),
        true);

    Serial.print("Encoded password sent: ");
    Serial.println(encodedPassword);

    Serial.println("Password submitted, waiting for server response");

    // Stop green LED blinking immediately
    keypadLedGreenOff();

    // Disable further input until server response
    inputEnabled = false;
    keyBuffer = "";
  }
}
