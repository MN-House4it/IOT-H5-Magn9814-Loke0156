#pragma once
#include <Arduino.h>

// ---------------- Mode ----------------
static const bool DEBUG_MODE = false;

// Debug logging macro - only prints if DEBUG_MODE is true
#define DEBUG_PRINTLN(msg) if (DEBUG_MODE) { Serial.println(msg); }
#define DEBUG_PRINT(msg) if (DEBUG_MODE) { Serial.print(msg); }

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
static const char *MQTT_TOPIC_UID = "rfid/uid";
static const char *MQTT_TOPIC_STATUS = "device-status";

// ---------------- Behavior ----------------
static const bool MQTT_RETAIN_UID = true;      // retain last UID on broker
static const uint32_t DEDUPE_WINDOW_MS = 1500; // avoid spamming same tag if held near reader

// ---------------- RFID (I2C) ----------------
static const uint8_t RFID_I2C_ADDR = 0x28; // M5Stack RFID/RFID2 default
