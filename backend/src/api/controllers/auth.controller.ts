import { Request, Response } from 'express';

import {
  AccessResult,
  GetAccessTokenRequestBody,
  LoginRequestBody,
  LogoutRequestBody,
} from '@api-types/auth.types';
import { APIResponse } from '@api-types/general.types';
import { getHttpStatusCode } from '@utils/Utils';

import * as AuthService from '../services/auth.service';

// Utility function to get the client's IP address

/**
 * Gets the client's IP address from the request headers.
 * @param {Request} req - The request object containing the headers.
 * @returns {string} The client's IP address.
 */
function getClientIp(req: Request<any>): string {
  return req.headers['x-forwarded-for'] as string;
}

/**
 * Handles user login, authenticates with passport, and returns tokens on successful login.
 * @param {Request<unknown, APIResponse<AccessResult>, LoginRequestBody>} req - The request object containing `username` and `password` in the body.
 * @param {Response<APIResponse<AccessResult>>} res - The response object to send authentication results.
 * @returns {Promise<void>} Resolves with tokens on success or an error response.
 */
export async function login(
  req: Request<unknown, APIResponse<AccessResult>, LoginRequestBody>,
  res: Response<APIResponse<AccessResult>>,
): Promise<void> {
  const { username, password } = req.body;

  const userObject: LoginRequestBody = {
    username,
    password,
    ip: getClientIp(req),
  };

  const response = await AuthService.login(userObject);

  res.status(getHttpStatusCode(response.status)).json(response).end();
}

/**
 * Logs out a user by invalidating their session token.
 * @param {Request<unknown, APIResponse, LogoutRequestBody>} req - The request object, containing the token in the body.
 * @param {Response<APIResponse>} res - The response object used to send the response to the client.
 * @returns {Promise<void>} - A promise that resolves when the logout is complete or rejects if an error occurs.
 */
export async function logout(
  req: Request<unknown, APIResponse, LogoutRequestBody>,
  res: Response<APIResponse>,
): Promise<void> {
  const { token } = req.body;
  const response = await AuthService.logout({
    token,
    ip: getClientIp(req),
  });

  res.status(getHttpStatusCode(response.status)).json(response).end();
}

/**
 * Endpoint to refresh user tokens based on the provided refresh token.
 * @param {Request<unknown, APIResponse<AccessResult>, GetAccessTokenRequestBody>} req - The request object containing the refresh token in the body.
 * @param {Response<APIResponse<AccessResult>>} res - The response object used to send the response to the client.
 * @returns {Promise<void>} - A promise that resolves when the access token is refreshed or rejects if an error occurs.
 */
export async function getAccessToken(
  req: Request<unknown, APIResponse<AccessResult>, GetAccessTokenRequestBody>,
  res: Response<APIResponse<AccessResult>>,
): Promise<void> {
  const { token } = req.body;
  const response = await AuthService.accessToken({
    token,
    ip: getClientIp(req),
  });

  res.status(getHttpStatusCode(response.status)).json(response).end();
}

/**
 * Endpoint to get the refresh token based on the provided access token in the authorization header.
 * @param {Request} req - The request object, containing the Authorization header.
 * @param {Response} res - The response object used to send the response to the client.
 * @returns {Promise<void>} - A promise that resolves when the refresh token is retrieved or rejects if an error occurs.
 */
export async function getRefreshToken(
  req: Request,
  res: Response,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(400).json({
      status: 'MissingData',
      message: 'Missing authentication',
    });
    return;
  }

  // Ensure it is a bearer token
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
    res.status(400).json({
      status: 'MissingData',
      message: 'Missing authentication',
    });
    return;
  }
  const token = tokenParts[1];

  const response = await AuthService.refreshToken({
    token,
    ip: getClientIp(req),
  });

  res.status(getHttpStatusCode(response.status)).json(response).end();
}
