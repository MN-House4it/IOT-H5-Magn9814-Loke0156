#pragma once
#include <Arduino.h>

// Initialize LED pins
void keypadLedInit();

// Start red LED blinking for specified duration
void keypadLedRedBlink(uint32_t durationMs);

// Start green LED blinking for specified duration
void keypadLedGreenBlink(uint32_t durationMs);

// Start red LED glowing (solid on) for specified duration
void keypadLedRedGlow(uint32_t durationMs);

// Start green LED glowing (solid on) for specified duration
void keypadLedGreenGlow(uint32_t durationMs);

// Turn off red LED immediately
void keypadLedRedOff();

// Turn off green LED immediately
void keypadLedGreenOff();

// Update LED states (call in loop)
void keypadLedLoop();

// Handle MQTT message related to LED states
void keypadLedHandleMqtt(char *topic, byte *payload, unsigned int length);

// Set door open state (for timeout monitoring)
void keypadLedSetDoorOpen(bool isOpen);

// Get door open state
bool keypadLedGetDoorOpen();

// Set input enabled (forward declaration for keypad.cpp)
void keypadSetInputEnabled(bool enabled);

// Clear input buffer (forward declaration for keypad.cpp)
void keypadClearBuffer();
