import axios from 'axios';
import https from 'https';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

//import { AccessResult } from '@api-types/auth.types';
import { APIResponse } from '@api-types/general.types';

import config from '../config';

const BASE_URL = process.env.VITE_API_URL; // HTTPS URL

// Create an HTTPS agent with 'rejectUnauthorized' set to false to allow self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates
});

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true,
  httpsAgent, // Pass the agent to Axios
});

/** Interface for the login response structure */
interface AccessResult {
  data: {
    accessToken: {
      token: string;
      authType: string;
    };
    refreshToken?: {
      token: string;
    };
  };
}

/**
 * Pauses execution for the given number of milliseconds.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the given delay.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs in a user with the provided credentials.
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 * @returns {Promise<APIResponse<AccessResult>>} A promise that resolves with the login response.
 */
async function loginUser(
  username: string,
  password: string,
): Promise<APIResponse<AccessResult>> {
  return axiosInstance.post('/login', { username, password });
}
/**
 * Logs in a user with the provided credentials.
 * @param {string} token - The username of the user.
 * @returns {Promise<ApiResponse<AccessResult>>} A promise that resolves with the login response.
 */
async function logoutUser(token: string): Promise<APIResponse<AccessResult>> {
  return axiosInstance.post('/logout', { token });
}

/**
 * Validates a successful login response structure.
 * @param {APIResponse<AccessResult>} response - The response object to validate.
 */
function validateLoginSuccess(response: APIResponse<AccessResult>): void {
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined(); // Ensures data exists before further checks

  expect(response.data).toMatchObject({
    data: {
      accessToken: {
        token: expect.any(String) as string,
        authType: expect.any(String) as string,
      },
    },
  });
}

/**
 * Calls the refresh token endpoint with an access token.
 * @param {string} accessToken - The access token to include in the request.
 * @returns {Promise<APIResponse<AccessResult>>} A promise that resolves with the refresh token response.
 */
async function callRefreshToken(
  accessToken: string,
): Promise<APIResponse<AccessResult>> {
  return axiosInstance.get('/refreshToken', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Calls the access token endpoint with a refresh token.
 * @param {string} refreshToken - The refresh token to use for obtaining a new access token.
 * @returns {Promise<APIResponse<AccessResult>>} A promise that resolves with the new access token response.
 */
async function callAccessToken(
  refreshToken: string,
): Promise<APIResponse<AccessResult>> {
  return axiosInstance.post('/accessToken', { token: refreshToken });
}

describe('Auth API Endpoints', () => {
  beforeAll(() => {
    // Any setup needed before tests run
  });

  afterAll(() => {
    // Any cleanup needed after tests finish
  });

  it('should login a user successfully', async () => {
    const response = await loginUser('admin', 'YWRtaW4=');
    validateLoginSuccess(response);
  });

  it('should return error for invalid login credentials (valid Base64, wrong password)', async () => {
    const response = await loginUser('admin', 'd3JvbmdwYXNzd29yZA==');
    expect(response.status).toBe(401); // Unauthorized
  });

  it('should return error for wrong password format (not Base64, correct password)', async () => {
    const response = await loginUser('admin', 'admin');
    expect(response.status).toBe(400); // Bad Request due to wrong format
  });
  it('should return error for wrong password format (not Base64, wrong password)', async () => {
    const response = await loginUser('admin', 'WrongPassword');
    expect(response.status).toBe(400); // Bad Request due to wrong format
  });

  it('should login a user, refresh tokens, and obtain new access token', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    validateLoginSuccess(loginResponse);

    const initialAccessToken = loginResponse.data?.data.accessToken
      .token as string;
    const refreshResponse = await callRefreshToken(initialAccessToken);
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.data?.data).toHaveProperty('refreshToken');

    const newRefreshToken = refreshResponse.data?.data.refreshToken?.token;
    if (newRefreshToken) {
      const accessTokenResponse = await callAccessToken(newRefreshToken);
      expect(accessTokenResponse.status).toBe(200);
      validateLoginSuccess(accessTokenResponse);
    }
  });

  it('should login a user, refresh tokens multiple times', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    validateLoginSuccess(loginResponse);

    let accessToken = loginResponse.data?.data.accessToken.token as string;
    if (!accessToken) {
      throw new Error('Access token is missing');
    }
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      const refreshResponse = await callRefreshToken(accessToken);
      expect(refreshResponse.status).toBe(200);
      const newRefreshToken = refreshResponse.data?.data.refreshToken?.token;
      if (newRefreshToken) {
        const accessTokenResponse = await callAccessToken(newRefreshToken);
        expect(accessTokenResponse.status).toBe(200);
        accessToken = accessTokenResponse.data?.data.accessToken
          .token as string;
      }
    }
  });

  it('should expire initial access token after refresh and invalidate session', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    await sleep(500);
    validateLoginSuccess(loginResponse);
    const initialAccessToken = loginResponse.data?.data.accessToken
      .token as string;
    if (!initialAccessToken) {
      throw new Error('Access token is missing');
    }

    const refreshResponse = await callRefreshToken(initialAccessToken);
    await sleep(500);
    expect(refreshResponse.status).toBe(200);
    const newRefreshToken = refreshResponse.data?.data.refreshToken?.token;

    if (newRefreshToken) {
      const accessTokenResponse = await callAccessToken(newRefreshToken);
      await sleep(500);
      expect(accessTokenResponse.status).toBe(200);

      const retryRefresh = await callRefreshToken(initialAccessToken);
      await sleep(500);
      expect(retryRefresh.status).toBe(401); // Initial token expired, unauthorized
    }
  });

  it('should fail to use expired refresh token for access token', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    await sleep(500);
    validateLoginSuccess(loginResponse);

    const initialAccessToken = loginResponse.data?.data.accessToken
      .token as string;
    if (!initialAccessToken) {
      throw new Error('Access token is missing');
    }
    const refreshResponse = await callRefreshToken(initialAccessToken);
    await sleep(500);
    expect(refreshResponse.status).toBe(200);
    const newRefreshToken = refreshResponse.data?.data.refreshToken?.token;

    if (newRefreshToken) {
      const accessTokenResponse = await callAccessToken(newRefreshToken);
      await sleep(500);
      expect(accessTokenResponse.status).toBe(200);

      // Attempt to reuse the expired refresh token
      const retryAccessTokenResponse = await callAccessToken(newRefreshToken);
      await sleep(500);
      expect(retryAccessTokenResponse.status).toBe(401); // Unauthorized due to expired token
    }
  });

  it('should fail because the refresh token to get a new access token is invalid format', async () => {
    const refreshResponse = await callRefreshToken('NotAValidTokensFormat');
    expect(refreshResponse.status).toBe(400);
  });

  it('should fail because the access token to get the refresh token is invalid format', async () => {
    const refreshResponse = await callAccessToken('NotAValidTokensFormat');
    expect(refreshResponse.status).toBe(400);
  });

  it('should login a user successfully and the logout the user with a access token', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    validateLoginSuccess(loginResponse);
    const initialAccessToken = loginResponse.data?.data.accessToken
      .token as string;
    const logoutResponde = await logoutUser(initialAccessToken);
    expect(logoutResponde.status).toBe(200);
  });
  it('should login a user successfully and the logout the user with a refresh token', async () => {
    const loginResponse = await loginUser('admin', 'YWRtaW4=');
    validateLoginSuccess(loginResponse);
    const initialAccessToken = loginResponse.data?.data.accessToken
      .token as string;
    const refreshResponse = await callRefreshToken(initialAccessToken);
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.data?.data).toHaveProperty('refreshToken');

    const refreshToken = refreshResponse.data?.data.refreshToken
      ?.token as string;
    const logoutResponde = await logoutUser(refreshToken);
    expect(logoutResponde.status).toBe(200);
  });
  it('should fail logout because no token was provided', async () => {
    const logoutResponde = await axiosInstance.post('/logout');
    expect(logoutResponde.status).toBe(400);
  });
});
