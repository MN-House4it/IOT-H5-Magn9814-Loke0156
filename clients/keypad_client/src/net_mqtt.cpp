#include "net_mqtt.h"
#include "config.h"
#include "keypad_led.h"
#include <ArduinoJson.h>

static WiFiClient wifiClient;
static PubSubClient mqtt(wifiClient);
static mqtt_callback_t mqtt_callback = nullptr;

bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

void mqttInit()
{
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(keypadLedHandleMqtt);
}

void ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  if (WiFi.status() == WL_NO_MODULE)
  {
    Serial.println("WiFi module not found. Check WiFiNINA module/firmware.");
  }

  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(WIFI_SSID);

  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void ensureMQTT(const String &deviceName)
{
  while (!mqtt.connected())
  {
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(deviceName);
    Serial.print(" ... ");

    bool ok = false;
    if (mqttHasAuth())
    {
      ok = mqtt.connect(deviceName.c_str(), MQTT_USER, MQTT_PASS);
    }
    else
    {
      ok = mqtt.connect(deviceName.c_str());
    }

    if (ok)
    {
      Serial.println("connected!");
      String statusPayload = "{\"deviceId\": \"" + deviceName + "\", \"status\": \"online\"}";
      mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);

      if (mqtt.subscribe(MQTT_TOPIC_STATE))
      {
        Serial.print("Subscribed to: ");
        Serial.println(MQTT_TOPIC_STATE);
      }

      if (mqtt.subscribe("doorlock/action"))
      {
        Serial.print("Subscribed to: doorlock/action");
      }
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

bool mqttPublish(const char *topic, const char *payload, bool retain)
{
  return mqtt.publish(topic, payload, retain);
}

void mqttLoop()
{
  mqtt.loop();
}

void setMqttCallback(mqtt_callback_t callback)
{
  mqtt_callback = callback;
}
