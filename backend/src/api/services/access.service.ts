import argon2 from 'argon2';
import { MqttClient } from 'mqtt';
import prisma from '@prisma-instance';
import { PendingSession } from '@api-types/mqtt.types';
import { AccessStatus, IAccessLogData } from '@api-types/access.types';
import config from '@config';

/**
 * Access control service - handles the RFID door access flow
 */

// State timing configuration
const STATE_TIMES = {
  IncorrectKeycard: config.MQTT_Incorrect_Keycard_STATE_TIME,
  AwaitingPassword: config.MQTT_Awaiting_Password_STATE_TIME,
  AccessGranted: config.MQTT_Access_Granted_STATE_TIME,
  IncorrectPassword: config.MQTT_Incorrect_Password_STATE_TIME,
} as const;

type StateType = keyof typeof STATE_TIMES;

// Store pending sessions in memory - one per door
const pendingSessions = new Map<string, PendingSession>();

const SESSION_TIMEOUT_MS = STATE_TIMES.AwaitingPassword;

/**
 * Process RFID card scan
 * Flow:
 * 1. Look up deviceId in door table
 * 2. If not found - stop
 * 3. If found - validate keycard
 * 4. If invalid - publish IncorrectKeycard
 * 5. If valid - publish AwaitingPassword and start 30s timer
 */
export async function processRfidScan(
  rfidUid: string,
  rfidDeviceId: string,
  client: MqttClient,
): Promise<void> {

  try {
    // Step 1: Look up deviceId in door table
    const door = await prisma.door.findUnique({
      where: { rfidDeviceId },
      include: {
        accessGrants: {
          include: {
            userKeycard: {
              include: {
                keycard: true,
              },
            },
          },
        },
      },
    });

    if (!door) {
      console.warn(`Door not found for RFID device: ${rfidDeviceId}`);
      return;
    }

    console.info(`Door found: ${door.id}`);

    // Step 2: Validate keycard - find matching keycard by RFID UID
    const userKeycard = door.accessGrants.find(
      (grant) => grant.userKeycard.keycard.code === rfidUid && grant.userKeycard.keycard.active
    )?.userKeycard;

    if (!userKeycard) {
      console.warn(`Invalid keycard: ${rfidUid}`);
      publishMessage(
        client,
        door.keypadDeviceId,
        'IncorrectKeycard',
        STATE_TIMES.IncorrectKeycard,
      );
      // Log invalid keycard attempt
      await logAccessAttempt({
        doorId: door.id,
        keycardCode: rfidUid,
        accessStatus: AccessStatus.INCORRECT_KEYCARD,
        details: 'Keycard not found or not active',
      });
      return;
    }

    console.info(`Valid keycard found: ${rfidUid}`);

    // Log valid keycard attempt
    await logAccessAttempt({
      doorId: door.id,
      userKeycardId: userKeycard.id,
      keycardCode: rfidUid,
      accessStatus: AccessStatus.CORRECT_KEYCARD,
    });

    // Step 3: Clear any existing session for this door
    if (pendingSessions.has(door.id)) {
      const existingSession = pendingSessions.get(door.id)!;
      clearTimeout(existingSession.timeoutHandle);
      pendingSessions.delete(door.id);
    }

    // Step 4: Create pending session and start timer
    const timeoutHandle = setTimeout(() => {
      console.warn(`Session timeout for door: ${door.id}`);
      publishMessage(client, door.keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      pendingSessions.delete(door.id);
    }, SESSION_TIMEOUT_MS);

    const session: PendingSession = {
      deviceId: rfidDeviceId,
      doorId: door.id,
      cardUid: rfidUid,
      expiresAt: Date.now() + SESSION_TIMEOUT_MS,
      timeoutHandle,
      userKeycardId: userKeycard.id,
      keycardPassword: userKeycard.password,
    };

    pendingSessions.set(door.id, session);

    console.info(`Session created - waiting for password (30s timeout)`);
    publishMessage(client, door.keypadDeviceId, 'AwaitingPassword', STATE_TIMES.AwaitingPassword);
  } catch (error) {
    console.error('Error processing RFID scan:', error);
  }
}

/**
 * Process password input from keypad
 * Flow:
 * 1. Receive password from keypad/key
 * 2. Check if session exists and hasn't timed out
 * 3. If timeout - publish IncorrectPassword
 * 4. If within 30s - validate password
 * 5. If correct - publish AccessGranted
 * 6. If incorrect - publish IncorrectPassword
 */
export async function processPasswordInput(
  password: string,
  keypadDeviceId: string,
  client: MqttClient,
): Promise<void> {
  try {
    // Find the session for this keypad
    const door = await prisma.door.findUnique({
      where: { keypadDeviceId },
    });

    if (!door) {
      console.warn(`Door not found for keypad device: ${keypadDeviceId}`);
      return;
    }

    const session = pendingSessions.get(door.id);

    if (!session) {
      console.warn(`No active session for door: ${door.id}`);
      publishMessage(client, keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      return;
    }

    // Check if session has timed out
    if (Date.now() > session.expiresAt) {
      console.warn(`Session expired for door: ${door.id}`);
      clearTimeout(session.timeoutHandle);
      pendingSessions.delete(door.id);
      publishMessage(client, keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      
      // Log session timeout
      await logAccessAttempt({
        doorId: door.id,
        userKeycardId: session.userKeycardId,
        keycardCode: session.cardUid,
        accessStatus: AccessStatus.SESSION_TIMEOUT,
        details: 'Password entry timeout exceeded',
      });
      return;
    }

    // Decode base64 password
    let decodedPassword: string;
    try {
      decodedPassword = Buffer.from(password, 'base64').toString('utf-8');
    } catch (err) {
      console.error(`Failed to decode base64 password:`, err);
      publishMessage(client, keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      return;
    }

    // Verify password using argon2
    try {
      const isPasswordValid = await argon2.verify(session.keycardPassword, decodedPassword);
      
      if (isPasswordValid) {
        console.info(`Password correct for door: ${door.id}`);
        clearTimeout(session.timeoutHandle);
        pendingSessions.delete(door.id);
        publishMessage(client, keypadDeviceId, 'AccessGranted', STATE_TIMES.AccessGranted);

        // Log successful password verification
        await logAccessAttempt({
          doorId: door.id,
          userKeycardId: session.userKeycardId,
          keycardCode: session.cardUid,
          accessStatus: AccessStatus.CORRECT_PASSWORD,
        });

        // Trigger door unlock
        triggerDoorUnlock(client, door.doorlockDeviceId, config.MQTT_DOOR_OPEN_STATE_TIME);
        
        // Log access granted and door unlocked
        await logAccessAttempt({
          doorId: door.id,
          userKeycardId: session.userKeycardId,
          keycardCode: session.cardUid,
          accessStatus: AccessStatus.ACCESS_GRANTED,
        });

        await logAccessAttempt({
          doorId: door.id,
          userKeycardId: session.userKeycardId,
          keycardCode: session.cardUid,
          accessStatus: AccessStatus.DOOR_UNLOCKED,
        });
        return;
      }

      console.warn(`Incorrect password for door: ${door.id}`);
      publishMessage(client, keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      
      // Log incorrect password attempt
      await logAccessAttempt({
        doorId: door.id,
        userKeycardId: session.userKeycardId,
        keycardCode: session.cardUid,
        accessStatus: AccessStatus.INCORRECT_PASSWORD,
        details: 'Password verification failed',
      });
    } catch (err) {
      console.error(`Error verifying password with argon2:`, err);
      publishMessage(client, keypadDeviceId, 'IncorrectPassword', STATE_TIMES.IncorrectPassword);
      
      // Log password verification error
      await logAccessAttempt({
        doorId: door.id,
        userKeycardId: session.userKeycardId,
        keycardCode: session.cardUid,
        accessStatus: AccessStatus.INCORRECT_PASSWORD,
        details: `Password verification error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  } catch (error) {
    console.error('Error processing password:', error);
  }
}

/**
 * Publish state message to keypad
 */
function publishMessage(
  client: MqttClient,
  keypadDeviceId: string,
  state: StateType,
  time: number,
): void {
  const topic = config.MQTT_KEYPAD_STATE_TOPIC;
  const payload = JSON.stringify({ deviceId: keypadDeviceId, state, time }, null, 2);

  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`Failed to publish to ${topic}:`, err);
    } else {
      console.info(`📡 Published ${state} to ${topic}`);
    }
  });
}

/**
 * Trigger door unlock
 */
function triggerDoorUnlock(
  client: MqttClient,
  doorlockDeviceId: string,
  timeMs: number,
): void {
  const topic = config.MQTT_DOORLOCK_OPEN_TOPIC;
  const payload = JSON.stringify({ deviceId: doorlockDeviceId, time: timeMs }, null, 2);

  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`Failed to publish door unlock to ${topic}:`, err);
    } else {
      console.info(`Door unlock command sent to ${topic} for device ${doorlockDeviceId}`);
    }
  });
}

/**
 * Clean up all sessions (useful for graceful shutdown)
 */
export function cleanupAllSessions(): void {
  for (const [doorId, session] of pendingSessions) {
    clearTimeout(session.timeoutHandle);
    console.info(`Cleaned up session for door: ${doorId}`);
  }
  pendingSessions.clear();
}

/**
 * Log access attempt to database
 * Can be used for audit trails and statistics
 */
export async function logAccessAttempt(data: IAccessLogData): Promise<void> {
  try {
    const log = await prisma.accessLog.create({
      data: {
        doorId: data.doorId,
        userKeycardId: data.userKeycardId,
        keycardCode: data.keycardCode,
        accessStatus: data.accessStatus,
        details: data.details,
      },
    });

    console.info(`Access logged for door ${data.doorId} - Status: ${data.accessStatus}`);
  } catch (error) {
    console.error('Error logging access attempt:', error);
    // Don't throw - logging failures shouldn't block the access flow
  }
}
