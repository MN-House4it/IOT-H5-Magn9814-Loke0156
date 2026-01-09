import { Request, Response } from 'express';

import * as ResetService from '@services/reset.service';
import { getHttpStatusCode } from '@utils/Utils';

interface ResetPasswordRequestBody {
  oldPassword: string;
  newPassword: string;
}

/**
 * Controller to reset the user's password
 * @async
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {*} The response object
 */
export async function resetPassword(
  req: Request<
    Record<string, any>,
    Record<string, any>,
    ResetPasswordRequestBody
  >,
  res: Response,
): Promise<void> {
  const userId = req.user?.id; // Extract user ID from authenticated request context
  const { oldPassword, newPassword } = req.body;

  // Validate that oldPassword and newPassword are strings
  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    res
      .status(400)
      .json({
        status: 'Failed',
        message:
          'Invalid input: `oldPassword` and `newPassword` must be strings.',
      })
      .end();
    return;
  }

  // Ensure user ID is present (e.g., extracted from authentication middleware)
  if (!userId) {
    res
      .status(401)
      .json({ status: 'Failed', message: 'User ID is required' })
      .end();
    return;
  }

  // Call the service to reset the password
  const response = await ResetService.resetPassword(
    userId,
    oldPassword,
    newPassword,
  );

  res.status(getHttpStatusCode(response.status)).json(response).end();
}
