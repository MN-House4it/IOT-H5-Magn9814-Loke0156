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

// Build JSON payload containing device ID and RFID UID for MQTT publishing. \n for readability.
String buildJsonPayload(const String &deviceId, const String &uid)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n  \"rfidUid\": \"";
  json += uid;
  json += "\"\n}";
  return json;
}
