#include "net_mqtt.h"
#include "config.h"
#include "device_id.h"
#include "payloads.h"

NetMqtt::NetMqtt() : _mqtt(_wifi) {}

void NetMqtt::begin()
{
  _mqtt.setServer(MQTT_HOST, MQTT_PORT);
}

void NetMqtt::ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED) return;

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

void NetMqtt::ensureMQTT(const String& clientId)
{
  while (!_mqtt.connected()) {
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(clientId);
    Serial.print(" ... ");

    bool ok = false;
    if (mqttHasAuth()) ok = _mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    else              ok = _mqtt.connect(clientId.c_str());

    if (ok) {
      Serial.println("connected!");
      publishOnlineStatus(clientId);
    } else {
      Serial.print("failed, rc=");
      Serial.print(_mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

void NetMqtt::publishOnlineStatus(const String& deviceName)
{
  String statusPayload = buildStatusJson(deviceName, "online");
  _mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);

  Serial.print("MQTT status payload: ");
  Serial.println(statusPayload);
}

void NetMqtt::loop()
{
  _mqtt.loop();
}

bool NetMqtt::publish(const char* topic, const String& payload, bool retain)
{
  return _mqtt.publish(topic, payload.c_str(), retain);
}
