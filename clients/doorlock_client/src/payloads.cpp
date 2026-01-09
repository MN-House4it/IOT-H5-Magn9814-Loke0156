#include "payloads.h"

// Build JSON status payload containing device ID and status for MQTT publishing. \n for readability.
String buildStatusJson(const String &deviceId, const String &status)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n  \"status\": \"";
  json += status;
  json += "\"\n}";
  return json;
}

// Build JSON payload containing device ID and door action for MQTT publishing. \n for readability.
String buildDoorActionJson(const String &deviceId, const String &action)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"" + deviceId + "\",\n";
  json += "  \"action\": \"" + action + "\"\n";
  json += "}";
  return json;
}
