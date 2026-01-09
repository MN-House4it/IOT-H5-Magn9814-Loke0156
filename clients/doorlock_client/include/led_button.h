#pragma once
#include <Arduino.h>

// Set LED output state (on or off)
void setLED(bool on);

// Turn off LED and update internal state
void turnOffLED();

// Handle physical button press and release events
void handleButtonPress();

// Handle incoming MQTT messages for LED control
void ledHandleMqtt(char *topic, byte *payload, unsigned int length);

// Update LED state based on timing (call regularly in main loop)
void ledLoop();
