# IOT Project

Welcome to the IOT project by **Magn9814** and **Loke0156**.

This repository contains an IoT access-control system consisting of multiple hardware clients (door lock, keypad, RFID) and a backend responsible for authentication, access logic, and MQTT communication.

---

## Repository structure

### Clients (`/clients`)
All hardware client implementations live in the `clients/` folder.

Start here:
- **Clients overview:** [`clients/README.md`](./clients/README.md)

The clients include:
- **Door client** – Represents a door lock using a light (locked/unlocked).
- **Keypad client** – A keypad-based combination lock for entering a PIN.
- **RFID client** – Reads RFID tags and initiates the login flow.

---

### Client-specific READMEs

Each client has its own README with setup details and usage instructions:

- **Door lock client:**  
  [`clients/doorlock_client/README.md`](./clients/doorlock_client/README.md)

- **Keypad client:**  
  [`clients/keypad_client/README.md`](./clients/keypad_client/README.md)

- **RFID client:**  
  [`clients/rfid_client/README.md`](./clients/rfid_client/README.md)

> The root README acts as the entry point. More detailed or hardware-specific information is documented in the README closest to the code.

---

## Backend

The backend handles:
- Access control logic
- MQTT communication with devices
- Database storage
- API endpoints and health checks

It is designed to run using **Docker Compose**.

---

## Getting the backend up and running

### Prerequisites
Make sure you have:
- **Docker**
- **Docker Compose**
- **Node.js (npm)**

---

### Development setup

1. **Install backend dependencies**
   ```bash
   npm run install

2. **Start the backend**
   ```bash
   npm run dev

**You can also run the seed file to seed the database with initial data like some users and keycards using the following**
   ```bash
   npm run seed