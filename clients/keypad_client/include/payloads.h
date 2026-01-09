#pragma once
#include <Arduino.h>

String buildStatusJson(const String &deviceId, const String &status);
String buildKeyJson(const String &deviceId, const String &input);
