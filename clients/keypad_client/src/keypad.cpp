#include "keypad.h"
#include "config.h"
#include "net_mqtt.h"
#include "device_id.h"
#include "payloads.h"
#include "keypad_led.h"

// --- Keypad pin definitions ---
const uint8_t ROW_PINS[4] = {2, 3, 4, 5};
const uint8_t COL_PINS[4] = {6, 7, 8, 9};

// Key layout
const char KEYMAP[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'0', 'F', 'E', 'D'}};

// --- Keypad state ---
static char lastKey = 0;
static uint32_t lastChangeMs = 0;
static String keyBuffer = "";
static bool inputEnabled = false;
static const uint32_t KEYPAD_DEBOUNCE_MS = 40;

// --- Base64 encoding ----------------
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

void keypadInit()
{
  for (uint8_t r = 0; r < 4; r++)
  {
    pinMode(ROW_PINS[r], OUTPUT);
    digitalWrite(ROW_PINS[r], HIGH);
  }

  for (uint8_t c = 0; c < 4; c++)
    pinMode(COL_PINS[c], INPUT_PULLUP);
}

char scanKeypad()
{
  for (uint8_t r = 0; r < 4; r++)
  {
    for (uint8_t rr = 0; rr < 4; rr++)
      digitalWrite(ROW_PINS[rr], HIGH);

    digitalWrite(ROW_PINS[r], LOW);
    delayMicroseconds(5);

    for (uint8_t c = 0; c < 4; c++)
      if (digitalRead(COL_PINS[c]) == LOW)
        return KEYMAP[r][c];
  }
  return 0;
}

void keypadLoop()
{
  char k = scanKeypad();
  uint32_t now = millis();

  if (k != lastKey)
  {
    lastChangeMs = now;
    lastKey = k;
  }

  if ((now - lastChangeMs) > KEYPAD_DEBOUNCE_MS)
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
        keypadSubmit();
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
}

void keypadSetInputEnabled(bool enabled)
{
  inputEnabled = enabled;
}

String keypadGetBuffer()
{
  return keyBuffer;
}

void keypadClearBuffer()
{
  keyBuffer = "";
}

void keypadSubmit()
{
  if (keyBuffer.length())
  {
    String deviceName = getUniqueID();
    String encodedPassword = base64Encode(keyBuffer);

    mqttPublish(MQTT_TOPIC_KEY,
                buildKeyJson(deviceName, encodedPassword).c_str(),
                true);

    Serial.print("Encoded password sent: ");
    Serial.println(encodedPassword);

    Serial.println("Password submitted, waiting for server response");

    // Stop green LED blinking immediately since password was submitted
    keypadLedGreenOff();

    // Disable input until next MQTT state
    inputEnabled = false;
    keyBuffer = "";
  }
}
