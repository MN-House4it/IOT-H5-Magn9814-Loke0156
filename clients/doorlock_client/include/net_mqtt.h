#pragma once
#include <Arduino.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

// MQTT callback function type
typedef void (*mqtt_callback_t)(char *topic, byte *payload, unsigned int length);

// Initialize MQTT server connection parameters
void mqttInit();

// Ensure WiFi connection is established
void ensureWiFi();

// Ensure MQTT connection is established and maintained
void ensureMQTT(const String &deviceName);

// Check if MQTT authentication is configured
bool mqttHasAuth();

// Publish a message to an MQTT topic
bool mqttPublish(const char *topic, const char *payload, bool retain = false);

// Process MQTT communication (call regularly in main loop)
void mqttLoop();
