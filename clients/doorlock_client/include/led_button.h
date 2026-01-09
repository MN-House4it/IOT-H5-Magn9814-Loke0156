#pragma once
#include <Arduino.h>

void setLED(bool on);
void turnOffLED();
void handleButtonPress();
void ledHandleMqtt(char *topic, byte *payload, unsigned int length);
void ledLoop();
