#include <Arduino.h>
#include <ArduinoUniqueID.h>
#include <Wire.h>
#include <MFRC522_I2C.h>

#include <WiFiNINA.h>      // <<< Uno WiFi Rev2 uses WiFiNINA
#include <PubSubClient.h>

#include "config.h"

// ---------------- RFID ----------------
MFRC522_I2C mfrc522(RFID_I2C_ADDR, -1);

// ---------------- MQTT ----------------
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ---------------- State ----------------
String lastUid;
uint32_t lastPublishMs = 0;

static bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

// Build a stable device name based on MAC address of the WiFi module
static String getUniqueID()
{
    String id = "";

    for (size_t i = 0; i < UniqueIDsize; i++)
    {
        if (UniqueID[i] < 0x10)
            id += "0";
        id += String(UniqueID[i], HEX);
    }

    id.toUpperCase();
    return id;
}

static void ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED) return;

  // If NINA firmware is missing/outdated, this can help debug
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("WiFi module not found. Check WiFiNINA module/firmware.");
  }

  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(WIFI_SSID);

  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

static void ensureMQTT(const String& deviceName)
{
  while (!mqtt.connected()) {
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(deviceName);
    Serial.print(" ... ");

    bool ok = false;
    if (mqttHasAuth()) {
      ok = mqtt.connect(deviceName.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      ok = mqtt.connect(deviceName.c_str());
    }

    if (ok) {
      Serial.println("connected!");
      mqtt.publish(MQTT_TOPIC_STATUS, "online", true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

static String uidToString()
{
  String s;
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) s += '0';
    s += String(mfrc522.uid.uidByte[i], HEX);
    if (i + 1 < mfrc522.uid.size) s += ':';
  }
  s.toUpperCase();
  return s;
}

static String buildJsonPayload(const String& deviceId, const String& uid)
{
  String json;
  json += "{\n";
  json += "  \"deviceId\": \"";
  json += deviceId;
  json += "\",\n  \"rfidUid\": \"";
  json += uid;
  json += "\"\n}";
  return json;
}


void setup()
{
  Serial.begin(115200);
  while (!Serial) { delay(10); }

  Wire.begin();
  delay(50);

  mfrc522.PCD_Init();
  Serial.println("RFID2 (I2C) ready. Tap a card/tag...");

  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  ensureWiFi();

  String deviceName = getUniqueID();
  Serial.print("Device name: ");
  Serial.println(deviceName);

  ensureMQTT(deviceName);
}

void loop()
{
  String deviceName = getUniqueID();

  ensureMQTT(deviceName);
  mqtt.loop();

  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(20);
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(20);
    return;
  }

  String uid = uidToString();

  Serial.print("PICC type: ");
  Serial.println(mfrc522.PICC_GetTypeName(mfrc522.PICC_GetType(mfrc522.uid.sak)));
  Serial.print("UID: ");
  Serial.println(uid);

  uint32_t now = millis();
  bool duplicate = (uid == lastUid) && (now - lastPublishMs < DEDUPE_WINDOW_MS);

  if (!duplicate) {
  String payload = buildJsonPayload(deviceName, uid);

  bool ok = mqtt.publish(
    MQTT_TOPIC_UID,
    payload.c_str(),
    MQTT_RETAIN_UID
  );

Serial.print("MQTT payload: ");
Serial.println(payload);
    Serial.print("MQTT publish ");
    Serial.println(ok ? "OK" : "FAILED");

    lastUid = uid;
    lastPublishMs = now;
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  delay(250);
}
