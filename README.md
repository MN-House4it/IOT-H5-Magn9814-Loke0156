# IOT Project

Welcome to the IOT project by **Magn9814** and **Loke0156**.

This repository contains an **IoT access-control system** consisting of multiple hardware clients (door lock, keypad, RFID) and a backend responsible for authentication, access logic, database storage, and MQTT communication.

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js (latest LTS recommended)** – https://nodejs.org  
2. **Docker** – https://www.docker.com/products/docker-desktop  
3. **Docker Compose** (usually included with Docker Desktop)

---

## Repository Structure

### Clients (`/clients`)
All hardware client implementations live in the `clients/` folder.

Start here:  
- **Clients overview:** [`clients/README.md`](./clients/README.md)

Included clients:
- **Door client** – Represents a door lock using a light (locked/unlocked).
- **Keypad client** – A keypad-based combination lock for entering a PIN.
- **RFID client** – Reads RFID tags and initiates the login flow.

### Client-specific READMEs

Each client has its own README with setup and usage instructions:

- **Door lock client:**  
  [`clients/doorlock_client/README.md`](./clients/doorlock_client/README.md)

- **Keypad client:**  
  [`clients/keypad_client/README.md`](./clients/keypad_client/README.md)

- **RFID client:**  
  [`clients/rfid_client/README.md`](./clients/rfid_client/README.md)

> The root README is the entry point. Hardware- or client-specific details live closest to the code.

---

## Backend

The backend handles:
- Authentication & access-control logic
- MQTT communication with devices
- Database storage
- API endpoints and health checks

It is designed to run using **Docker Compose**.

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/MN-House4it/IOT-H5-Magn9814-Loke0156.git
cd IOT-H5-Magn9814-Loke0156
```

### 2. Create and fill out environment files (if applicable)

If your backend and/or clients require environment variables, create the necessary `.env` files.

> If example files exist, copy them and rename appropriately  
> (e.g. `.env.example` → `.env.dev` or `.env`).

---

### 3. Install backend dependencies

From the project root, install dependencies:

```bash
npm run install
```

---

### 4. Start the backend (development)

Run the backend using Docker Compose:

```bash
npm run dev
```

---

### 5. Seed the database (optional)

Seeds the database with initial data such as users and keycards:

```bash
npm run seed
```

---

## Notes / Troubleshooting

- If Docker containers fail to start due to timing or startup issues, wait a few seconds and try again.
- Ensure Docker Desktop is running before starting the backend.
- Always check the client-specific READMEs for hardware setup, wiring, and device requirements.
