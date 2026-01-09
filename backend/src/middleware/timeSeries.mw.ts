import { NextFunction, Request, Response } from 'express';

import { Status } from '@api-types/general.types';
import prisma from '@prisma-instance';
import { getHttpStatusCode } from '@utils/Utils';

interface IRequestBody {
  value: number;
  identifier: string;
  name: string;
  deviceId: string;
  locationId: string;
}

interface IRequest extends Request {
  body: IRequestBody[];
}

/**
 * Middleware to validate the request parameters.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function in the chain.
 * @returns {void}
 */
export async function addDeviceDetails(
  req: IRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const deviceId = req.headers['device-id'] as string;

  if (!deviceId) {
    res.status(getHttpStatusCode(Status.Unauthorized)).json({
      status: Status.Unauthorized,
      message: 'deviceId header is required',
    });

    return;
  }

  const device = await prisma.device.findUnique({ where: { uuid: deviceId } });

  if (!device) {
    res.status(getHttpStatusCode(Status.Unauthorized)).json({
      status: Status.Unauthorized,
      message: 'Device not found',
    });

    return;
  }

  if (!req.body || !Array.isArray(req.body)) {
    res.status(getHttpStatusCode(Status.InvalidDetails)).json({
      status: Status.InvalidDetails,
      message: 'Request body should be an array',
    });

    return;
  }

  req.body.map((element) => {
    element.deviceId = deviceId;
    element.locationId = device.locationUuid;
  });

  next();
}
