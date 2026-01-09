#include "net_mqtt.h"
#include "config.h"
#include "keypad_led.h"
#include <ArduinoJson.h>

// WiFi client instance used by the MQTT client
static WiFiClient wifiClient;

// MQTT client instance bound to the WiFi client
static PubSubClient mqtt(wifiClient);

// Optional externally set MQTT callback (currently unused here)
static mqtt_callback_t mqtt_callback = nullptr;

// Check if MQTT authentication credentials are configured
bool mqttHasAuth()
{
  return MQTT_USER && MQTT_USER[0] != '\0';
}

// Initialize MQTT server connection parameters
void mqttInit()
{
  // Configure MQTT broker address and port
  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  // Set callback to handle incoming MQTT messages
  mqtt.setCallback(keypadLedHandleMqtt);
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
    Serial.println("WiFi module not found. Check WiFiNINA module/firmware.");
  }

  // Initiate WiFi connection
  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(WIFI_SSID);

  // Block until WiFi connection succeeds
  while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED)
  {
    Serial.print(".");
    delay(500);
  }

  // Report successful connection with assigned IP
  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

// Ensure MQTT connection is established and maintained
void ensureMQTT(const String &deviceName)
{
  // Retry connection loop until successful
  while (!mqtt.connected())
  {
    // Ensure WiFi is connected before attempting MQTT
    ensureWiFi();

    Serial.print("Connecting to MQTT as ");
    Serial.print(deviceName);
    Serial.print(" ... ");

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
      Serial.println("connected!");

      // Publish online status with retain flag
      // This allows subscribers to see last known device state
      String statusPayload =
          "{\"deviceId\": \"" + deviceName + "\", \"status\": \"online\"}";
      mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);

      // Subscribe to state update topic
      if (mqtt.subscribe(MQTT_TOPIC_STATE))
      {
        Serial.print("Subscribed to: ");
        Serial.println(MQTT_TOPIC_STATE);
      }

      // Subscribe to door lock action commands
      if (mqtt.subscribe("doorlock/action"))
      {
        Serial.print("Subscribed to: doorlock/action");
      }
    }
    else
    {
      // Log connection failure and retry
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

// Publish a message to an MQTT topic
bool mqttPublish(const char *topic, const char *payload, bool retain)
{
  return mqtt.publish(topic, payload, retain);
}

// Process incoming MQTT messages and maintain connection
void mqttLoop()
{
  mqtt.loop();
}

// Set an external MQTT callback handler (currently unused by mqtt client)
void setMqttCallback(mqtt_callback_t callback)
{
  mqtt_callback = callback;
}
