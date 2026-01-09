import { Request, Response } from 'express';

import { APIResponse, Status } from '@api-types/general.types';
import { ChangePasswordRequestBody } from '@api-types/profile.types';
import { BasicUser, User } from '@api-types/user.types';
import * as ProfileService from '@services/profile.service';
import { getHttpStatusCode } from '@utils/Utils';

// eslint-disable-next-line no-secrets/no-secrets
/**
 * Controller so user's can change there own password
 * @param {Response<APIResponse>} req - The request object
 * @param {Request<Record<string, any>, APIResponse, ChangePasswordRequestBody>} res - The response object
 * @returns {Promise<void>} The response object
 */
export async function changePassword(
  req: Request<Record<string, any>, APIResponse, ChangePasswordRequestBody>,
  res: Response<APIResponse>,
): Promise<void> {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user as User;

  const response = await ProfileService.changePassword(
    id,
    newPassword,
    oldPassword,
  );

  res.status(getHttpStatusCode(response.status)).json(response).end();
}
// eslint-disable-next-line no-secrets/no-secrets
/**
 * Controller so user's can get their profile data
 * @param {Request<APIResponse<BasicUser>>} req - The request object
 * @param {Request<unknown, APIResponse<BasicUser>, ChangePasswordRequestBody>} res - The response object
 * @returns {Promise<void>} The response object
 */
export async function getProfile(
  req: Request<unknown, APIResponse<BasicUser>, ChangePasswordRequestBody>,
  res: Response<APIResponse<BasicUser>>,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(400).json({
      status: Status.MissingDetails,
      message: 'Missing authentication',
    });
    return;
  }

  // Ensure it is a bearer token
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
    res.status(400).json({
      status: Status.MissingDetails,
      message: 'Missing authentication',
    });
    return;
  }
  const token = tokenParts[1];

  const response = await ProfileService.getProfile(token);

  res.status(getHttpStatusCode(response.status)).json(response).end();
}
