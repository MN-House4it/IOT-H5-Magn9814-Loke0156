import { Response } from 'express';

import { ExpressFunction, Status } from '@api-types/general.types';
import prisma from '@prisma-instance';
import { getHttpStatusCode } from '@utils/Utils';

/**
 * Middleware to check if the user has the required permissions to access a route.
 * @param {string[]} permissions - The permissions required to access the route.
 * @returns {ExpressFunction} The middleware function to check permissions.
 */
export function isAllowed(permissions: string[] | string): ExpressFunction {
  if (typeof permissions === 'string') permissions = [permissions];

  return async (req, res: Response, next) => {
    const user = req.user;

    if (!user) {
      res
        .status(getHttpStatusCode(Status.Unauthorized))
        .json({ status: 'Unauthorized', message: 'Unauthorized' });

      return;
    }

    const Permissions = await prisma.userPermissions.findMany({
      where: {
        AND: { userId: user.id, Permission: { code: { in: permissions } } },
      },
    });

    if (Permissions.length) return next();

    res
      .status(getHttpStatusCode(Status.Forbidden))
      .json({ status: 'Forbidden', message: 'Forbidden' });

    return;
  };
}
