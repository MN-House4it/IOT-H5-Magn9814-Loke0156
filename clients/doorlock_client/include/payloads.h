#pragma once
#include <Arduino.h>

String buildStatusJson(const String &deviceId, const String &status);
String buildDoorActionJson(const String &deviceId, const String &action);
