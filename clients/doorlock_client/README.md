# doorlock_client

An Arduino/PlatformIO client that implements the **doorlock step** in the RFID → keypad → doorlock flow.

It:
- connects to **WiFi** and **MQTT**
- publishes an **online** status when connected
- **subscribes to control commands** from the backend on `doorlock/open`
- provides **local door state events** (open/close) via a **physical button**
- publishes those door events to MQTT on `doorlock/action`
- drives a **LED** as a simple “unlock/active” indicator for a requested duration

> Note: In the current implementation, the “door lock” behavior is represented by a LED.
> There is no servo/relay control in this client yet—only LED to represent it.

---

## What it does

### 1) Boots and connects (WiFi + MQTT)
On boot, the client:
- initializes Serial (9600) *(set to 9600 due to terminal printing errors)*
- initializes the LED and turns it off
- initializes the button GPIO with pull-up
- initializes MQTT (`mqttInit()`)
- connects to WiFi (`ensureWiFi()`)
- derives a unique `deviceId` (`getUniqueID()`) and connects to MQTT (`ensureMQTT(deviceId)`)
- prints readiness: “Door lock controller ready. Listening for MQTT messages...”

On MQTT connect, it also publishes an online status JSON (retained) to `device-status` and subscribes to the control topic `doorlock/open`.

---

### 2) Listens for unlock/control commands on MQTT (`doorlock/open`)
The client subscribes to `MQTT_TOPIC_CONTROL`, which is `doorlock/open`.

Incoming control messages are handled by the MQTT callback `ledHandleMqtt`.

#### Expected payload format (control)
The handler expects JSON containing:
- `deviceId` (must match this device)
- `time` (milliseconds to keep LED on)

It validates those fields, and if `deviceId` matches, it turns on the LED and keeps it on until `millis() + time`.

Example control payload published to `doorlock/open`:
```json
{
  "deviceId": "515351333120A8470F0F",
  "time": 3000
}
