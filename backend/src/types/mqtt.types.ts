export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export interface DeviceStatusMessage {
  deviceId: string;
  status: DeviceStatus;
}

export interface RfidKeyMessage {
  deviceId: string;
  rfidUid: string
}

// Pending session stored per deviceId (one active attempt per keypad/door)
export interface PendingSession {
  deviceId: string;
  doorId: string;
  cardUid: string;
  expiresAt: number; // epoch ms
  timeoutHandle: NodeJS.Timeout;
  userKeycardId: string;
  keycardPassword: string;
}

export interface PasswordMessage {
  deviceId: string;
  input: string;
}
