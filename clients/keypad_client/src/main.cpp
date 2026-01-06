#include <Arduino.h>

// --- Pin mapping (adjust to match your wiring) ---
static const uint8_t rowPins[4] = {2, 3, 4, 5}; // ROW1..ROW4
static const uint8_t colPins[4] = {6, 7, 8, 9}; // COL1..COL4

// Key layout (change to your preferred mapping)
static const char keymap[4][4] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'0', 'F', 'E', 'D'}
};

// Simple debounce state
static char lastKey = 0;
static uint32_t lastChangeMs = 0;
static const uint32_t debounceMs = 40;

// Scan the keypad once. Returns 0 if no key pressed, otherwise the char.
char scanKeypad()
{
  // Columns are inputs with pullups (idle HIGH)
  // Rows are driven one-at-a-time LOW to detect a press.
  for (uint8_t r = 0; r < 4; r++)
  {
    // Set all rows HIGH first (inactive)
    for (uint8_t rr = 0; rr < 4; rr++) {
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
  while (!Serial) { /* USB Serial */ }

  // Setup rows as outputs, default HIGH
  for (uint8_t r = 0; r < 4; r++) {
    pinMode(rowPins[r], OUTPUT);
    digitalWrite(rowPins[r], HIGH);
  }

  // Setup cols as inputs with pullups
  for (uint8_t c = 0; c < 4; c++) {
    pinMode(colPins[c], INPUT_PULLUP);
  }

  Serial.println("PmodKYPD scan start...");
}

void loop()
{
  char k = scanKeypad();

  // Debounce + "edge detect" (print only when a new stable key appears)
  uint32_t now = millis();

  if (k != lastKey) {
    lastChangeMs = now;
    lastKey = k;
  }

  if ((now - lastChangeMs) > debounceMs) {
    static char reported = 0;

    if (k != 0 && k != reported) {
      reported = k;
      Serial.print("Key: ");
      Serial.println(k);
    }

    // Reset reported when released so it can be printed again next press
    if (k == 0 && reported != 0) {
      reported = 0;
    }
  }

  delay(5);
}
