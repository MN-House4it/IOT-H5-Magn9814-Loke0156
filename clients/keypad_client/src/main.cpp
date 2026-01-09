#include <Arduino.h>
#include "config.h"
#include "device_id.h"
#include "net_mqtt.h"
#include "payloads.h"
#include "keypad.h"
#include "keypad_led.h"

void setup()
{
  Serial.begin(115200);
  while (!Serial)
    delay(10);

  keypadInit();
  keypadLedInit();

  mqttInit();

  ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device ID: ");
  Serial.println(deviceName);

  ensureMQTT(deviceName);

  Serial.println("Keypad client ready");
}

void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqttLoop();

  keypadLedLoop();
  keypadLoop();

  delay(5);
}
