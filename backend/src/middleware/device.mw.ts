import argon2 from 'argon2';
import { NextFunction, Request, Response } from 'express';

import { Status } from '@api-types/general.types';
import { PrismaClient } from '@prisma/client';
import { UuidSchema } from '@schemas/general.schema';
import { getHttpStatusCode } from '@utils/Utils';

import { unauthorizedResponse } from './authenticate.mw';

const prisma = new PrismaClient();

/**
 * Middleware to check if the user has the required permissions to access a route.
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express NextFunction object
 * @returns {void} The middleware function to check permissions.
 */
export async function useApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const deviceUuid = req.headers['device-id'] as string;

  if (!deviceUuid && !apiKey) {
    next('route');
    return;
  }

  if (!deviceUuid) {
    res.status(401).json({
      status: 'Unauthorized',
      message: 'device-id header is required when x-api-key is provided',
    });
    return;
  }

  try {
    const validate = UuidSchema.validate(deviceUuid);

    if (validate.error) {
      res.status(getHttpStatusCode(Status.InvalidDetails)).json({
        status: Status.InvalidDetails,
        message: '[device-id] must be a valid GUID',
      });
      return;
    }

    const device = await prisma.device.findUnique({
      where: { uuid: validate.value },
    });

    if (!apiKey && device?.status !== 'AWAITING') {
      res.status(401).json({
        status: 'Unauthorized',
        message: 'x-api-key header is required when deviceId is provided',
      });

      return;
    }

    if (validate.error) {
      res.status(400).json({
        status: Status.InvalidDetails,
        message: '[device-id] must be a valid GUID',
      });
      return;
    }

    if (!device) {
      res.status(401).json(unauthorizedResponse);
      return;
    }

    let hasAccess = false;

    if (device.status === 'AWAITING') {
      hasAccess = true;
    } else {
      const verifyToken = await argon2.verify(device.token as string, apiKey);

      if (verifyToken) {
        hasAccess = true;
      }
    }

    if (hasAccess) {
      delete req.query.id;
      req.query.uuid = deviceUuid; // Set the uuid query parameter
      next();
      return;
    } else {
      res.status(401).json(unauthorizedResponse);
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: Status.Failed,
      message: 'Something went wrong on our end',
    });
  }
}
