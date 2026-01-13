# keypad_client

An Arduino/PlatformIO client that implements the **keypad step** in the RFID → password → unlock flow.

It:
- connects to **WiFi** and **MQTT**
- publishes an **online** status when connected
- listens for **state updates** from the backend (AwaitingPassword / IncorrectKeycard / IncorrectPassword / AccessGranted)
- reads a **4x4 matrix keypad**
- **Base64 encodes** the entered password and publishes it to MQTT
- drives **red/green LEDs** to guide the user (blink/glow patterns)
- optionally reacts to **door open/close events** over MQTT from the doorlock client

---

## What it does

### 1) Boots and connects (WiFi + MQTT)
On boot, the client:
- initializes Serial (115200)
- initializes keypad GPIO and LED controller
- initializes MQTT config
- connects to WiFi
- connects to MQTT
- subscribes to `keypad/state` and `doorlock/action`
- prints “Keypad client ready” if it's in debug mode

See startup sequence in `src/main.cpp` and connection/subscription behavior in `src/net_mqtt.cpp`.

### 2) Waits for backend to request password entry
By default, keypad input is **disabled**. When a state message arrives on `keypad/state` for this keypad’s `deviceId`, the client updates LEDs and toggles whether input is accepted.

- `AwaitingPassword` → enable input + green blink
- `IncorrectKeycard` / `IncorrectPassword` → disable input + red blink
- `AccessGranted` → disable input + green glow

### 3) Collects keypad input (debounced)
The keypad is scanned as a matrix (4 rows × 4 columns). The keymap is:

1 2 3 A
4 5 6 B
7 8 9 C
0 F E D

Pins and keymap are defined in `src/keypad.cpp`, with debouncing and buffer logic in `keypadLoop()`.

#### Special keys
When input is enabled:
- `E` = submit password
- `D` = backspace (removes last char)  
- `C` = clear buffer
- `A`, `B`, `F` are ignored as control keys

If the backend has not requested a password yet, key presses are ignored entirely (“Input ignored (not awaiting password)”).

### 4) Publishes the password over MQTT (Base64 encoded)
On submit (`E`) the client:
- base64 encodes the buffer
- builds JSON `{ deviceId, input }`
- publishes it to the keypad password topic (retained = `true`)
- disables input until the backend responds
- stops green blinking immediately

This behavior is in `keypadSubmit()` and the JSON format is built in `src/payloads.cpp`.

Example payload published to `keypad/key`:
```json
{
  "deviceId": "515351333120A8470F0F",
  "input": "MTIzNA=="
}
