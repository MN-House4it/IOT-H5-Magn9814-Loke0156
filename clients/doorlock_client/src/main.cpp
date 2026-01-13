#include <Arduino.h>
#include "config.h"
#include "device_id.h"
#include "net_mqtt.h"
#include "payloads.h"
#include "led_button.h"

void setup()
{
  // Initialize serial communication for debugging
  Serial.begin(9600); // Set down from 1150200 to 9600 due to terminal printing errors.
  while (!Serial)
  {
    delay(10);
  }

  // Initialize LED control
  pinMode(LED_PIN, OUTPUT);
  setLED(false);

  // Initialize button input with pull-up
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize MQTT configuration
  mqttInit();

  // Establish WiFi connection
  ensureWiFi();

  // Get unique device identifier
  String deviceName = getUniqueID();
  DEBUG_PRINT("Device name: ");
  DEBUG_PRINTLN(deviceName);

  // Connect to MQTT broker
  ensureMQTT(deviceName);

  DEBUG_PRINTLN("Door lock controller ready. Listening for MQTT messages...");
}

void loop()
{
  // Get the device identifier for MQTT messages
  String deviceName = getUniqueID();

  // Maintain MQTT connection and process incoming messages
  ensureMQTT(deviceName);
  mqttLoop();

  // Handle physical button presses for door control
  handleButtonPress();
  // Handle LED status feedback
  ledLoop();

  delay(50);
}
