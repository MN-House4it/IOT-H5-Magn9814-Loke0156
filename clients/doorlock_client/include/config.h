#pragma once
#include <Arduino.h>

// ---------------- Mode ----------------
static const bool TEST_MODE = false;

// ---------------- WiFi ----------------
static const char *WIFI_SSID = "IOT-H5-Magn9814-Loke0156";
static const char *WIFI_PASSWORD = "Pa55w.rd";

// ---------------- MQTT ----------------
static const char *MQTT_HOST = "192.168.10.10";
static const uint16_t MQTT_PORT = 1883;

// Leave empty ("") if you don't use authentication
static const char *MQTT_USER = "admin";
static const char *MQTT_PASS = "Admin1234!";

// ---------------- Topics ----------------
static const char *MQTT_TOPIC_CONTROL = "doorlock/open";  // Listen for control commands
static const char *MQTT_TOPIC_STATUS = "device-status";   // Publish status
static const char *MQTT_TOPIC_ACTION = "doorlock/action"; // Publish door action (open/close)

// ---------------- Grove LED (Digital pin - on/off) ----------------
static const uint8_t LED_PIN = A0; // LED connected to A0

// ---------------- Grove Button (Digital pin) ----------------
static const uint8_t BUTTON_PIN = A1; // Button connected to A1
