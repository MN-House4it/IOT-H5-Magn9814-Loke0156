#include "net_mqtt.h"
#include "config.h"
#include "device_id.h"
#include "payloads.h"

// Constructor - initialize MQTT client with WiFi connection
NetMqtt::NetMqtt() : _mqtt(_wifi) {}

// Initialize MQTT server connection parameters
void NetMqtt::begin()
{
  _mqtt.setServer(MQTT_HOST, MQTT_PORT);
}

// Ensure WiFi connection is established
void NetMqtt::ensureWiFi()
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
void NetMqtt::ensureMQTT(const String &clientId)
{
  // Retry connection loop until successful
  while (!_mqtt.connected())
  {
    // Ensure WiFi is available before attempting MQTT connection
    ensureWiFi();

    // Attempt MQTT connection with optional authentication
    Serial.print("Connecting to MQTT as ");
    Serial.print(clientId);
    Serial.print(" ... ");

    bool ok = false;
    if (mqttHasAuth())
      ok = _mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    else
      ok = _mqtt.connect(clientId.c_str());

    // Handle connection result
    if (ok)
    {
      Serial.println("connected!");
      // Publish online status message
      publishOnlineStatus(clientId);
    }
    else
    {
      // Retry connection after delay
      Serial.print("failed, rc=");
      Serial.print(_mqtt.state());
      Serial.println(". Retrying in 2s...");
      delay(2000);
    }
  }
}

// Publish device online status to MQTT broker
void NetMqtt::publishOnlineStatus(const String &deviceName)
{
  // Build and publish status message with retain flag
  String statusPayload = buildStatusJson(deviceName, "online");
  _mqtt.publish(MQTT_TOPIC_STATUS, statusPayload.c_str(), true);

  // Log the published status
  Serial.print("MQTT status payload: ");
  Serial.println(statusPayload);
}

// Process MQTT communication (call regularly in main loop)
void NetMqtt::loop()
{
  _mqtt.loop();
}

// Publish a message to a specific MQTT topic
bool NetMqtt::publish(const char *topic, const String &payload, bool retain)
{
  return _mqtt.publish(topic, payload.c_str(), retain);
}
