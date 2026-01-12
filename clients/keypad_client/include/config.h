#pragma once
#include <Arduino.h>

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
static const char *MQTT_TOPIC_KEY = "keypad/key";
static const char *MQTT_TOPIC_STATE = "keypad/state";
static const char *MQTT_TOPIC_STATUS = "device-status";

// ---------------- Keypad pins ----------------
extern const uint8_t ROW_PINS[4];
extern const uint8_t COL_PINS[4];

// Key layout
extern const char KEYMAP[4][4];

// ---------------- Grove LEDs ----------------
static const uint8_t RED_LED_PIN = A0;
static const uint8_t GREEN_LED_PIN = A1;

// ---------------- LED Behavior ----------------
static const uint32_t LED_BLINK_INTERVAL_MS = 500;
static const uint32_t LED_GLOW_DURATION_MS = 5000;
static const uint32_t KEYPAD_DEBOUNCE_MS = 40;

// ---------------- Door device ----------------
static const char *DOOR_DEVICE_ID = "304242375241C9033432"; // Replace with your door's ID
