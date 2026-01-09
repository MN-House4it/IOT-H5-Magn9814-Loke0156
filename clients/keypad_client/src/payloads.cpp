#include "payloads.h"

// Build JSON status payload containing device ID and status for MQTT publishing.
// Uses formatted JSON with newlines for readability.
String buildStatusJson(const String &deviceId, const String &status)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n";
  json += "  \"status\": \"";
  json += status;
  json += "\"\n";
  json += "}";
  return json;
}

// Build JSON payload containing device ID and keypad input for MQTT publishing.
// Uses formatted JSON with newlines for readability.
String buildKeyJson(const String &deviceId, const String &input)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n";
  json += "  \"input\": \"";
  json += input;
  json += "\"\n";
  json += "}";
  return json;
}
