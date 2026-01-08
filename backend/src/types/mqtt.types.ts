export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export interface DeviceStatusMessage {
  deviceId: string;
  status: DeviceStatus;
}
