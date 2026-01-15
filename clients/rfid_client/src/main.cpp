#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "device_id.h"
#include "payloads.h"
#include "rfid_reader.h"
#include "net_mqtt.h"

// RFID reader instance using I2C communication
static RfidReader rfid(RFID_I2C_ADDR, -1);
// MQTT network handler
static NetMqtt net;

// Tracks the last read UID to detect duplicate reads
static String lastUid;
// Tracks when the last UID was published to the MQTT broker
static uint32_t lastPublishMs = 0;

void setup()
{
  // Initialize serial communication for debugging
  Serial.begin(115200);
  while (!Serial)
  {
    delay(10);
  }

  // Initialize I2C communication for RFID reader
  Wire.begin();
  delay(50);

  // Initialize RFID reader
  rfid.begin();
  DEBUG_PRINTLN("RFID2 (I2C) ready. Tap a card/tag...");

  // Initialize network and WiFi
  net.begin();
  net.ensureWiFi();

  // Get unique device identifier
  String deviceName = getUniqueID();
  DEBUG_PRINT("Device name: ");
  DEBUG_PRINTLN(deviceName);

  // Connect to MQTT broker
  net.ensureMQTT(deviceName);
}

void loop()
{
  // Get the device identifier for MQTT messages
  const String deviceName = getUniqueID();

  // Maintain MQTT connection and process incoming messages
  net.ensureMQTT(deviceName);
  net.loop();

  // Attempt to read an RFID card/tag
  String uid, piccType;
  if (!rfid.readUid(uid, piccType))
  {
    delay(20);
    return;
  }

  // Log the detected card information to the serial console
  DEBUG_PRINT("PICC type: ");
  DEBUG_PRINTLN(piccType);
  DEBUG_PRINT("UID: ");
  DEBUG_PRINTLN(uid);

  // Check if this is a duplicate read (same UID within deduplication window)
  const uint32_t now = millis();
  const bool duplicate = (uid == lastUid) && (now - lastPublishMs < DEDUPE_WINDOW_MS);

  if (!duplicate)
  {
    // Build MQTT payload with device info and UID
    String payload = buildJsonPayload(deviceName, uid);

    // Publish the UID to the MQTT broker
    bool ok = net.publish(MQTT_TOPIC_UID, payload, MQTT_RETAIN_UID);

    // Log the MQTT publication result
    DEBUG_PRINT("MQTT payload: ");
    DEBUG_PRINTLN(payload);
    DEBUG_PRINT("MQTT publish ");
    DEBUG_PRINTLN(ok ? "OK" : "FAILED");

    // Update last read tracking
    lastUid = uid;
    lastPublishMs = now;
  }

  // Put the RFID reader into halt mode and wait before next read
  rfid.halt();
  delay(250);
}
