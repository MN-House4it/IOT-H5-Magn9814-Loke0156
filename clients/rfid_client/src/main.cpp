#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "device_id.h"
#include "payloads.h"
#include "rfid_reader.h"
#include "net_mqtt.h"

static RfidReader rfid(RFID_I2C_ADDR, -1);
static NetMqtt net;

static String lastUid;
static uint32_t lastPublishMs = 0;

void setup()
{
  Serial.begin(115200);
  while (!Serial) { delay(10); }

  Wire.begin();
  delay(50);

  rfid.begin();
  Serial.println("RFID2 (I2C) ready. Tap a card/tag...");

  net.begin();
  net.ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device name: ");
  Serial.println(deviceName);

  net.ensureMQTT(deviceName);
}

void loop()
{
  const String deviceName = getUniqueID();

  net.ensureMQTT(deviceName);
  net.loop();

  String uid, piccType;
  if (!rfid.readUid(uid, piccType)) {
    delay(20);
    return;
  }

  Serial.print("PICC type: ");
  Serial.println(piccType);
  Serial.print("UID: ");
  Serial.println(uid);

  const uint32_t now = millis();
  const bool duplicate = (uid == lastUid) && (now - lastPublishMs < DEDUPE_WINDOW_MS);

  if (!duplicate) {
    String payload = buildJsonPayload(deviceName, uid);

    bool ok = net.publish(MQTT_TOPIC_UID, payload, MQTT_RETAIN_UID);

    Serial.print("MQTT payload: ");
    Serial.println(payload);
    Serial.print("MQTT publish ");
    Serial.println(ok ? "OK" : "FAILED");

    lastUid = uid;
    lastPublishMs = now;
  }

  rfid.halt();
  delay(250);
}
