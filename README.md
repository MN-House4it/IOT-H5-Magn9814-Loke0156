# IOT Project

Welcome to the IOT project by **Magn9814** and **Loke0156**.

This repository contains an IoT solution composed of multiple client implementations, such as a door lock, keypad, and RFID reader.

---

## Repository structure

### Clients (`/clients`)
All client-related code is located in the `clients/` folder.

Start here:
- **Clients overview:** [`clients/README.md`](./clients/README.md)

That README describes the purpose of the different client implementations:
- **Door client** – Uses a light to represent an electronic door lock (on/off).
- **Keypad client** – A keypad-based combination lock for a door.
- **RFID client** – Listens for RFID tags and requests a login from the keypad.

---

### Client-specific READMEs

Some client folders contain their own README files with more detailed explanations and setup instructions:

- **Door lock client:**  
  [`clients/doorlock_client/README.md`](./clients/doorlock_client/README.md)

- **RFID client – MFRC522 I2C library:**  
  [`clients/rfid_client/lib/MFRC522_I2C/README.md`](./clients/rfid_client/lib/MFRC522_I2C/README.md)  
  This README explains how to use the MFRC522 RFID reader over I2C, including configuration options such as the reset pin and I2C address.

> If additional README files are added inside client folders, they should be linked from this main README to keep it as the central entry point to the project.

---

## Getting started

1. Navigate to the `clients/` folder.
2. Read the general client overview in [`clients/README.md`](./clients/README.md).
3. Follow the README inside the specific client folder you want to work with.

---

## Notes

- Some clients depend on third-party libraries included directly in the repository.
- Always check the README closest to the code you are modifying for client-specific requirements or setup steps.
