#pragma once
#include <Arduino.h>

String buildJsonPayload(const String& deviceId, const String& uid);
String buildStatusJson(const String& deviceId, const String& status);
