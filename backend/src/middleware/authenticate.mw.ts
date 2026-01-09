import argon2 from 'argon2';
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import type { WebSocket as ExpressWS } from 'ws';

import { Status } from '@api-types/general.types';
import { PrismaClient } from '@prisma/client';
import { UuidSchema } from '@schemas/general.schema';
import { getHttpStatusCode } from '@utils/Utils';

import '../passport';

const prisma = new PrismaClient();

export const unauthorizedResponse = {
  status: Status.Unauthorized,
  message: 'Unauthorized',
};

export const failResponse = {
  status: Status.Failed,
  message: 'Something went wrong on our end',
};

/**
 * Verifies the JWT token in the request header.
 * @param {Request} req - The request object containing the JWT token.
 * @param {Response} res - The response object to send the result of the verification.
 * @param {NextFunction} next - The next middleware function in the chain.
 * @returns {void} Resolves with the user data if the token is valid.
 */
export function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  passport.authenticate(
    'jwt',
    { session: false },
    (err: number, user: Express.User) => {
      if (err) return res.status(err).json(unauthorizedResponse);

      if (!user) {
        return res
          .status(getHttpStatusCode(Status.Unauthorized))
          .json(unauthorizedResponse);
      }

      req.user = user;
      next();
    },
  )(req, res, next);
}

export async function verifyApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void>;

export async function verifyApiKey(
  ws: ExpressWS,
  req: Request,
  next: NextFunction,
): Promise<void>;

export async function verifyApiKey(
  deviceId: string | undefined,
  apiKey: string | undefined,
): Promise<boolean>;

// eslint-disable-next-line jsdoc/require-jsdoc
export async function verifyApiKey(
  ...args:
    | [Request | ExpressWS, Response | Request, NextFunction]
    | [string | undefined, string | undefined]
): Promise<boolean | void> {
  let ws, req, res, next, deviceId, apiKey;

  try {
    if (args.length === 3) {
      if (args[0].protocol.includes('http')) {
        [req, res, next] = args as [Request, Response, NextFunction];
      } else [ws, req, next] = args as [ExpressWS, Request, NextFunction];

      deviceId = req.headers['device-id'] as string;
      apiKey = req.headers['x-api-key'] as string;
    } else {
      [deviceId, apiKey] = args;
    }

    if (!deviceId && !apiKey) {
      if (ws) {
        ws.send('device-id & x-api-key header is required');
        ws.close();
      }

      if (next) next('route');

      return false;
    }

    if (!apiKey) {
      if (ws) {
        ws.send('x-api-key header is required when deviceId is provided');
        ws.close();
      } else if (res) {
        res.status(401).json({
          status: 'Unauthorized',
          message: 'x-api-key header is required when deviceId is provided',
        });
      }

      return false;
    }

    const validate = UuidSchema.validate(deviceId);

    if (validate.error) {
      if (ws) {
        ws.send('[device-id] must be a valid GUID');
        ws.close();
      } else if (res) {
        res.status(400).json({
          status: Status.InvalidDetails,
          message: '[device-id] must be a valid GUID',
        });
      }

      return false;
    }

    const { value: uuid } = validate;
    const device = await prisma.device.findUnique({ where: { uuid } });

    if (!device) {
      if (ws) {
        ws.send('Device not found');
        ws.close();
      } else if (res) res.status(401).json(unauthorizedResponse);

      return false;
    }

    const verifyToken = await argon2.verify(device.token as string, apiKey);

    if (!verifyToken) {
      if (ws) {
        ws.send('Unauthorized');
      } else if (res) res.status(401).json(unauthorizedResponse);

      return false;
    }

    if (req && next) {
      delete req.query.id;
      req.query.uuid = deviceId;

      next();
    }
    return true;
  } catch {
    if (res) {
      res.status(getHttpStatusCode(Status.WsUnauthorized)).json(failResponse);
    }
  }
}
