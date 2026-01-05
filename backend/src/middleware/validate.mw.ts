import { NextFunction, Request, Response } from 'express';

import { Status } from '@api-types/general.types';
import { UuidSchema } from '@schemas/general.schema';
import { getHttpStatusCode } from '@utils/Utils';

/**
 * Middleware to validate the request parameters.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function in the chain.
 * @returns {void}
 */
export function validateParams(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { id } = req.params;

  const validate = UuidSchema.validate(id);

  if (validate.error) {
    res
      .status(getHttpStatusCode(Status.InvalidDetails))
      .json({
        status: Status.InvalidDetails,
        message: validate.error.message,
      })
      .end();

    return;
  }

  next();
}
