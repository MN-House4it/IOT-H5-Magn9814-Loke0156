#include <Arduino.h>
#include "config.h"
#include "device_id.h"
#include "net_mqtt.h"
#include "payloads.h"
#include "led_button.h"

void setup()
{
  Serial.begin(9600);
  while (!Serial)
  {
    delay(10);
  }

  pinMode(LED_PIN, OUTPUT);
  setLED(false);

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  mqttInit();

  ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device name: ");
  Serial.println(deviceName);

  ensureMQTT(deviceName);

  Serial.println("RGB LED controller ready. Listening for MQTT messages...");
}

void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqttLoop();

  handleButtonPress();
  ledLoop();

  delay(50);
}
