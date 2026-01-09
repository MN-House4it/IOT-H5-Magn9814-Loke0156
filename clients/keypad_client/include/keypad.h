#pragma once
#include <Arduino.h>

// Initialize keypad GPIO pins
void keypadInit();

// Scan keypad and return the key pressed (0 if none)
char scanKeypad();

// Process keypad input
void keypadLoop();

// Enable/disable keypad input
void keypadSetInputEnabled(bool enabled);

// Get current input buffer
String keypadGetBuffer();

// Clear input buffer
void keypadClearBuffer();

// Submit the current buffer (encode and publish)
void keypadSubmit();
