#include "net_mqtt.h"
#include "config.h"
#include "device_id.h"
#include "led_button.h"
#include <ArduinoJson.h>

// WiFi client instance
static WiFiClient wifiClient;
// MQTT client instance
static PubSubClient mqtt(wifiClient);

// Check if MQTT authentication credentials are configured
bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

// Initialize MQTT server connection parameters
void mqttInit()
{
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  // Set callback to handle incoming MQTT messages
  mqtt.setCallback(ledHandleMqtt);
}

// Ensure WiFi connection is established
void ensureWiFi()
{
  // Return early if already connected
  if (WiFi.status() == WL_CONNECTED)
    return;

  // Check if WiFi module is present
  if (WiFi.status() == WL_NO_MODULE)
  {
    DEBUG_PRINTLN("WiFi module not found. Check WiFiNINA module/firmware.");
  }

  // Initiate WiFi connection
  DEBUG_PRINT("Connecting to WiFi SSID: ");
  DEBUG_PRINTLN(WIFI_SSID);

  // Block until WiFi connection succeeds
  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED)
  {
    DEBUG_PRINT(".");
    delay(500);
  }

  // Report successful connection with assigned IP
  DEBUG_PRINTLN("");
  DEBUG_PRINT("WiFi connected. IP: ");
  DEBUG_PRINTLN(WiFi.localIP());
}

// Ensure MQTT connection is established and maintained
void ensureMQTT(const String &deviceName)
{
  // Retry connection loop until successful
  while (!mqtt.connected())
  {
    ensureWiFi();

    DEBUG_PRINT("Connecting to MQTT as ");
    DEBUG_PRINT(deviceName);
    DEBUG_PRINT(" ... ");

    // Attempt MQTT connection with or without authentication
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
      DEBUG_PRINTLN("connected!");
      // Publish online status with retain flag for last-will behavior
      String statusPayload = "{\"deviceId\": \"" + deviceName + "\", \"status\": \"online\"}";
      mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);

      // Subscribe to control topic for incoming commands
      if (mqtt.subscribe(MQTT_TOPIC_CONTROL))
      {
        DEBUG_PRINT("Subscribed to: ");
        DEBUG_PRINTLN(MQTT_TOPIC_CONTROL);
      }
      else
      {
        DEBUG_PRINTLN("Failed to subscribe");
      }
    }
    else
    {
      // Log connection failure and retry
      DEBUG_PRINT("failed, rc=");
      DEBUG_PRINT(mqtt.state());
      DEBUG_PRINTLN(". Retrying in 2s...");
      delay(2000);
    }
  }
}

// Publish a message to an MQTT topic
bool mqttPublish(const char *topic, const char *payload, bool retain)
{
  return mqtt.publish(topic, payload, retain);
}

// Process incoming MQTT messages
void mqttLoop()
{
  mqtt.loop();
}
