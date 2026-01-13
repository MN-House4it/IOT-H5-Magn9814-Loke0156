#include <Arduino.h>
#include "config.h"
#include "device_id.h"
#include "net_mqtt.h"
#include "payloads.h"
#include "keypad.h"
#include "keypad_led.h"

// Arduino setup function — runs once at boot
void setup()
{
  // Initialize serial communication for debugging
  Serial.begin(115200);
  while (!Serial)
    delay(10); // Wait for serial monitor to attach (USB boards)

  // Initialize keypad hardware and LED controller
  keypadInit();
  keypadLedInit();

  // Initialize MQTT client configuration
  mqttInit();

  // Ensure WiFi is connected before continuing
  ensureWiFi();

  // Obtain unique device identifier
  String deviceName = getUniqueID();
  DEBUG_PRINT("Device ID: ");
  DEBUG_PRINTLN(deviceName);

  // Establish MQTT connection and subscriptions
  ensureMQTT(deviceName);

  DEBUG_PRINTLN("Keypad client ready");
}

// Arduino main loop — runs continuously
void loop()
{
  // Retrieve device ID (used for MQTT reconnects if needed)
  String deviceName = getUniqueID();

  // Ensure MQTT connection remains active
  ensureMQTT(deviceName);

  // Process MQTT traffic (incoming/outgoing)
  mqttLoop();

  // Update LED states and keypad input handling
  keypadLedLoop();
  keypadLoop();

  // Small delay to avoid saturating CPU
  delay(5);
}
