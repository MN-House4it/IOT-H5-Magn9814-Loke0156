#include "payloads.h"

String buildStatusJson(const String &deviceId, const String &status)
{
  return "{\"deviceId\":\"" + deviceId + "\",\"status\":\"" + status + "\"}";
}

String buildKeyJson(const String &deviceId, const String &input)
{
  return "{\"deviceId\":\"" + deviceId + "\",\"input\":\"" + input + "\"}";
}
