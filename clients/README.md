# Access Control Clients

This folder contains the **three Arduino/PlatformIO clients** that together implement the full **RFID → keypad → doorlock** access-control flow.

Each client has its **own README** with detailed documentation, configuration, MQTT topics, and hardware setup.  
This document gives a **high-level overview of the system flow** and how the clients interact.

---

## Clients overview

- **rfid_client**
  - Reads RFID cards
  - Publishes scanned RFID UIDs to MQTT
  - Starts the access flow

- **keypad_client**
  - Handles password input via a 4×4 keypad
  - Displays feedback using red/green LEDs
  - Sends password input to the backend

- **doorlock_client**
  - Receives unlock commands from the backend
  - Reports door open/close events
  - Drives a status/unlock LED (or future lock hardware)

👉 See each client’s folder for detailed documentation.

---

## High-level access flow

The system is coordinated by the **backend**, using MQTT to communicate with all three clients.

```mermaid
flowchart TD
    A[RFID Card Scanned] --> B[Lookup deviceId in door table]

    B -->|Not found| X[Stop flow]

    B -->|Found| C[Validate keycard]

    C -->|Invalid keycard| D[
        Publish IncorrectKeycard<br/>
        Keypad LED: 🔴 Red Blink
    ] --> X

    C -->|Valid keycard| E[
        Publish AwaitingPassword<br/>
        Keypad LED: 🟢 Green Blink
    ]

    E --> F[Start 30s timer]

    F --> G[Receive password<br/>from keypad/key]

    G -->|Timeout| J[
        Publish IncorrectPassword<br/>
        Keypad LED: 🔴 Red Blink
    ] --> X

    G -->|Within 30s| H{Password correct?}

    H -->|Yes| I[
        Publish AccessGranted<br/>
        Keypad LED: 🟢 Green Solid<br/>
        Doorlock: Unlock
    ] --> X

    H -->|No| J --> X
