#pragma once
#include <Arduino.h>

// Build JSON status payload with device ID and status for MQTT publishing
String buildStatusJson(const String &deviceId, const String &status);

// Build JSON payload with device ID and door action for MQTT publishing
String buildDoorActionJson(const String &deviceId, const String &action);
