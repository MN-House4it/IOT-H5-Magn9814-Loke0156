#include "device_id.h"
#include <ArduinoUniqueID.h>
#include "config.h"

// Check if MQTT authentication credentials are configured
bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

// Convert the unique device ID to a hexadecimal string format. Credit goes to ricaun on GitHub for the original idea.
String getUniqueID()
{
  String id = "";
  // Iterate through each byte of the unique ID
  for (size_t i = 0; i < UniqueIDsize; i++)
  {
    // Pad single-digit hex values with leading zero
    if (UniqueID[i] < 0x10)
      id += "0";
    // Append the byte as hexadecimal
    id += String(UniqueID[i], HEX);
  }
  // Convert the result to uppercase
  id.toUpperCase();
  return id;
}
