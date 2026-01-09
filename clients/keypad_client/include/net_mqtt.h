#pragma once
#include <Arduino.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

typedef void (*mqtt_callback_t)(char *topic, byte *payload, unsigned int length);

void mqttInit();
void ensureWiFi();
void ensureMQTT(const String &deviceName);
bool mqttHasAuth();
bool mqttPublish(const char *topic, const char *payload, bool retain = false);
void mqttLoop();
void setMqttCallback(mqtt_callback_t callback);
