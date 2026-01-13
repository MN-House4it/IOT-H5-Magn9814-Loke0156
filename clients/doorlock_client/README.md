# doorlock_client

An Arduino/PlatformIO client that implements the **doorlock step** in the RFID → keypad → doorlock flow.

It:
- connects to **WiFi** and **MQTT**
- publishes an **online** status when connected
- **subscribes to control commands** from the backend on `doorlock/open`
- provides **local door state events** (open/close) via a **physical button**
- publishes those door events to MQTT on `doorlock/action`
- drives a **Grove LED** as a simple “unlock/active” indicator for a requested duration

> Note: In the current implementation, the “door lock” behavior is represented by LED feedback + door action events.
> There is no servo/relay control in this client yet—only LED + button + MQTT.

---

## What it does

### 1) Boots and connects (WiFi + MQTT)
On boot, the client:
- initializes Serial (9600) *(set to 9600 due to terminal printing errors)* :contentReference[oaicite:3]{index=3}
- initializes the LED GPIO and turns it off :contentReference[oaicite:4]{index=4}
- initializes the button GPIO with pull-up :contentReference[oaicite:5]{index=5}
- initializes MQTT (`mqttInit()`)
- connects to WiFi (`ensureWiFi()`)
- derives a unique `deviceId` (`getUniqueID()`) and connects to MQTT (`ensureMQTT(deviceId)`) :contentReference[oaicite:6]{index=6}
- prints readiness: “Door lock controller ready. Listening for MQTT messages...” :contentReference[oaicite:7]{index=7}

On MQTT connect, it also publishes an online status JSON (retained) to `device-status` :contentReference[oaicite:8]{index=8} and subscribes to the control topic `doorlock/open` :contentReference[oaicite:9]{index=9}.

---

### 2) Listens for unlock/control commands on MQTT (`doorlock/open`)
The client subscribes to `MQTT_TOPIC_CONTROL`, which is `doorlock/open` :contentReference[oaicite:10]{index=10} :contentReference[oaicite:11]{index=11}.

Incoming control messages are handled by the MQTT callback `ledHandleMqtt` :contentReference[oaicite:12]{index=12}.

#### Expected payload format (control)
The handler expects JSON containing:
- `deviceId` (must match this device)
- `time` (milliseconds to keep LED on)

It validates those fields :contentReference[oaicite:13]{index=13}, and if `deviceId` matches, it turns on the LED and keeps it on until `millis() + time` :contentReference[oaicite:14]{index=14}.

Example control payload published to `doorlock/open`:
```json
{
  "deviceId": "515351333120A8470F0F",
  "time": 3000
}
