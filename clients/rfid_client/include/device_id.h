#pragma once
#include <Arduino.h>

// Get the unique device ID as a hexadecimal string
String getUniqueID();

// Check if MQTT authentication is configured
bool mqttHasAuth();
