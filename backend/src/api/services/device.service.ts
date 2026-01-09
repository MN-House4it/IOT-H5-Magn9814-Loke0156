import argon2 from 'argon2';
import { UUID } from 'bson';
import Joi from 'joi';
import { WebSocket } from 'ws';

import { APIResponse, IAPIResponse, Status } from '@api-types/general.types';
import { getWss } from '@app';
import prisma, { errorResponse, prismaModels } from '@prisma-instance';
import { Device, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { includeLocation } from '@routes/device.routes';
import * as DefaultService from '@services/default.service';

import { Validate } from './default.service';

interface IDeviceResponse {
  'api-key': string;
}

/**
 * Service to create a record
 * @async
 * @param {Prisma.DeviceCreateInput} data - The data to create a record with.
 * @param {Joi.ObjectSchema} schema - The schema to validate the data against.
 * @returns {Promise<IAPIResponse>} A promise that resolves to an object containing the record data, status, and message.
 */
export async function create(
  data: Prisma.DeviceCreateInput,
  schema: Joi.ObjectSchema,
): Promise<APIResponse<IDeviceResponse>> {
  const { err, validatedData } = Validate('device', data, schema) as {
    err: IAPIResponse;
    validatedData: Prisma.DeviceCreateInput;
  };
  if (err) return err;

  try {
    await prisma.device.create({
      data: { ...validatedData },
    });

    return {
      status: Status.Created,
      message: `Created new device`,
    };
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    return errorResponse(prismaError, 'device', 'CreationFailed');
  }
}

/**
 * Service to get the devices
 * @async
 * @param {prismaModels} prismaModel - The Prisma model to get the records from.
 * @param {Joi.ObjectSchema} schema - The schema to validate the query object.
 * @param {Record<string, unknown>} config - The parameters to filter the records by.
 * @returns {Promise<IAPIResponse<IDeviceResponse>>} A promise that resolves to an object containing the new API key, status, and message.
 */
export async function getAll(
  prismaModel: prismaModels,
  schema: Joi.ObjectSchema,
  config: Record<string, unknown> = {},
): Promise<APIResponse<any>> {
  const response = await DefaultService.getAll<Device>(
    prismaModel,
    schema,
    config,
  );

  for (const device of response.data || []) {
    if (device.status === 'AWAITING') {
      const newStatus = 'ACTIVE';

      try {
        // Create a new token
        const randomUUID = new UUID();
        const hashedUUID = await argon2.hash(randomUUID.toString());

        // Update the status and token of the device in the DB
        await prisma.device.update({
          where: { uuid: device.uuid },
          data: {
            token: hashedUUID,
            status: newStatus,
          },
        });

        // Change the response
        device.token = randomUUID.toString();
        device.status = newStatus;
      } catch (error) {
        console.error('Error updating device:', error);
      }
    }
  }

  // if (response.data[0].status === 'AWAITING') {
  //   const newStatus = 'ACTIVE';

  //   try {
  //     // Create a new token
  //     const randomUUID = new UUID();
  //     const hashedUUID = await argon2.hash(randomUUID.toString());

  //     // Update the status and token of the device in the DB
  //     await prisma.device.update({
  //       where: { uuid: response.data[0].uuid as string },
  //       data: {
  //         token: hashedUUID,
  //         status: newStatus,
  //       },
  //     });

  //     // Change the response
  //     response.data[0].token = randomUUID;
  //     response.data[0].status = newStatus;
  //   } catch {}
  // }
  return response;
}

/**
 * Service to reset the API key for a device
 * @param {string} deviceUuid - The UUID of the device to reset the API key for.
 * @returns {Promise<IAPIResponse<IDeviceResponse>>} A promise that resolves to an object containing the new API key, status, and message.
 */
export async function resetApiKey(
  deviceUuid: string,
): Promise<APIResponse<IDeviceResponse>> {
  try {
    console.log(`Resetting API key for device UUID: ${deviceUuid}`); // Debugging log
    const device = await prisma.device.findUnique({
      where: { uuid: deviceUuid }, // Query by 'uuid' instead of 'id'
    });

    if (!device) {
      console.log(`Device with UUID ${deviceUuid} not found`); // Debugging log
      return {
        data: null,
        status: Status.NotFound,
        message: 'Device not found',
      };
    }

    // const newApiKey = new UUID().toString();
    // const hashedNewApiKey = await argon2.hash(newApiKey);

    await prisma.device.update({
      where: { uuid: deviceUuid }, // Update by 'uuid' instead of 'id'
      data: { token: null, status: 'AWAITING' },
    });

    return {
      data: null, // { 'api-key': newApiKey },
      status: Status.Success,
      message: 'API key reset successfully',
    };
  } catch (err) {
    console.error('Error resetting API key:', err); // Debugging log
    if (err instanceof PrismaClientKnownRequestError) {
      return {
        data: null,
        status: Status.ApiKeyResetFailed,
        message: 'Prisma error: Failed to reset API key',
      };
    }
    return {
      data: null,
      status: Status.ApiKeyResetFailed,
      message: 'Failed to reset API key',
    };
  }
}

/**
 * Websocket service for device routes.
 * @async
 * @param {WebSocket} ws - The websocket connection.
 * @param {string} deviceId - The UUID of the device.
 * @returns {void} A promise that resolves when the websocket connection is closed.
 */
export async function websocket(
  ws: WebSocket,
  deviceId?: string,
): Promise<void> {
  const device = await prisma.device.findUnique({
    where: { uuid: deviceId },
    ...includeLocation.prismaConfig,
  });

  if (!device) {
    ws.send('Device not found');
    ws.close();
    return;
  }

  ws.send(JSON.stringify(device));

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  getWss().on('device-update', async (uuid: string) => {
    uuid = new UUID(uuid).toString();
    const updatedDevice = await prisma.device.findUnique({ where: { uuid } });

    if (!updatedDevice) {
      ws.send('Device not found');
      ws.close();
      return;
    }

    const updatedDeviceUuid = new UUID(updatedDevice.uuid).toString();

    if (uuid === updatedDeviceUuid) ws.send(JSON.stringify(updatedDevice));
  });

  ws.on('message', (msg) => console.log(msg));
}
