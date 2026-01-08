#pragma once
#include <Arduino.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

class NetMqtt {
public:
  NetMqtt();

  void begin();                      // setServer(...)
  void ensureWiFi();
  void ensureMQTT(const String& clientId);

  void loop();
  bool publish(const char* topic, const String& payload, bool retain);

private:
  WiFiClient _wifi;
  PubSubClient _mqtt;

  void publishOnlineStatus(const String& deviceName);
};
