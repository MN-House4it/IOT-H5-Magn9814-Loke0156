#include "payloads.h"

String buildJsonPayload(const String& deviceId, const String& uid)
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

String buildStatusJson(const String& deviceId, const String& status)
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
