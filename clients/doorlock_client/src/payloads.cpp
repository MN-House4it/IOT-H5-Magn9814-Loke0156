#include "payloads.h"

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

String buildDoorActionJson(const String &deviceId, const String &action)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"" + deviceId + "\",\n";
  json += "  \"action\": \"" + action + "\"\n";
  json += "}";
  return json;
}
