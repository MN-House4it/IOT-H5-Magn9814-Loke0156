# rfid_client

An Arduino/PlatformIO client that reads RFID tag UIDs from an MFRC522 reader over **I2C**, then publishes scans to an **MQTT broker** as JSON. It also publishes an **online status** message when it connects.

This client is intended to be part of the door-access flow where the backend listens for RFID scans and initiates the keypad/password step.

---

## What it does

### 1) Connects to WiFi + MQTT
On boot, the client:
- starts Serial (115200)
- starts I2C (`Wire.begin()`)
- initializes the RFID reader
- connects to WiFi
- connects to MQTT (with optional username/password)
- publishes an `"online"` status message (retained) to the broker

See:
- Setup sequence in `src/main.cpp` (init, WiFi, MQTT)  
- MQTT connect + online publish in `src/net_mqtt.cpp`

### 2) Reads RFID card/tag UIDs
In the main loop the client:
- checks if a new RFID card/tag is present
- reads its UID
- formats it as uppercase hex with `:` separators (e.g. `E3:89:6E:AF`)
- halts the card to avoid repeated reads while the card is still present

RFID UID read + formatting is implemented in `src/rfid_reader.cpp`.

### 3) Publishes RFID scans to MQTT as JSON
When a UID is detected, the client publishes JSON to an MQTT topic:

```json
{
  "deviceId": "515351333120A8470F0F",
  "rfidUid": "E3:89:6E:AF"
}
