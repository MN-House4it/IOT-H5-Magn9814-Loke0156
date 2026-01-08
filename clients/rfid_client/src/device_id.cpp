#include "device_id.h"
#include <ArduinoUniqueID.h>
#include "config.h"

bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

String getUniqueID()
{
  String id = "";
  for (size_t i = 0; i < UniqueIDsize; i++) {
    if (UniqueID[i] < 0x10) id += "0";
    id += String(UniqueID[i], HEX);
  }
  id.toUpperCase();
  return id;
}
