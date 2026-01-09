/**
 * Access Log Types
 */

export enum AccessStatus {
  CORRECT_KEYCARD = 'CORRECT_KEYCARD',
  INCORRECT_KEYCARD = 'INCORRECT_KEYCARD',
  CORRECT_PASSWORD = 'CORRECT_PASSWORD',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  DOOR_UNLOCKED = 'DOOR_UNLOCKED',
}

export interface IAccessLogData {
  doorId: string;
  userKeycardId?: string;
  keycardCode?: string;
  accessStatus: AccessStatus;
  details?: string;
}

export interface IAccessLog extends IAccessLogData {
  id: string;
  timestamp: Date;
}
