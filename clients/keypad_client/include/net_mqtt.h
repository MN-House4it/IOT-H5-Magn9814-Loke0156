#pragma once
#include <Arduino.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

// MQTT callback function type
// Called when a subscribed MQTT message is received
typedef void (*mqtt_callback_t)(char *topic, byte *payload, unsigned int length);

// Initialize MQTT server connection parameters
void mqttInit();

// Ensure WiFi connection is established
void ensureWiFi();

// Ensure MQTT connection is established and maintained
void ensureMQTT(const String &deviceName);

// Check if MQTT authentication credentials are configured
bool mqttHasAuth();

// Publish a message to an MQTT topic
// retain=true keeps the message as the last known state on the broker
bool mqttPublish(const char *topic, const char *payload, bool retain = false);

// Process MQTT communication (must be called regularly in main loop)
void mqttLoop();

// Set a custom MQTT callback handler
// Allows overriding the default message handler
void setMqttCallback(mqtt_callback_t callback);
