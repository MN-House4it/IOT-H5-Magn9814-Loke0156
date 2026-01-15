#pragma once
#include <Arduino.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

// Network and MQTT communication handler
class NetMqtt
{
public:
  // Constructor
  NetMqtt();

  // Initialize MQTT server connection
  void begin();

  // Ensure WiFi connection is established
  void ensureWiFi();

  // Ensure MQTT connection is established
  void ensureMQTT(const String &clientId);

  // Process MQTT communication (call regularly)
  void loop();

  // Publish a message to a MQTT topic
  bool publish(const char *topic, const String &payload, bool retain);

private:
  // WiFi client connection
  WiFiClient _wifi;
  // MQTT client
  PubSubClient _mqtt;

  // Publish device online status to MQTT
  void publishOnlineStatus(const String &deviceName);

  // Check if MQTT authentication is configured
  bool mqttHasAuth();
};
