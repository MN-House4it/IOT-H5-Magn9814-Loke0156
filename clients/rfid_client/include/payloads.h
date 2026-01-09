#pragma once
#include <Arduino.h>

// Build JSON payload with device ID and RFID UID for MQTT publishing
String buildJsonPayload(const String& deviceId, const String& uid);

// Build JSON status payload with device ID and status for MQTT publishing
String buildStatusJson(const String& deviceId, const String& status);
