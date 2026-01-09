import { Mutex } from 'async-mutex';
import { UUID } from 'bson';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import { UserToken } from '@api-types/JWTToken';
import {
  AccessResult,
  LoginAttemptsCache,
  LoginRequestBody,
  RefreshResult,
  TokenRequestBody,
} from '@api-types/auth.types';
import { APIResponse, Status } from '@api-types/general.types';
import config from '@config';
import prisma from '@prisma-instance';
import { Session } from '@prisma/client';
import { LoginSchema, TokenSchema } from '@schemas/auth.schema';

/**
 * Generates a JSON Web Token (JWT) for the given user.
 * @param {UserToken} user - The user object to encode in the token payload.
 * @param {string | null} ip - The IP address to include in the secret for additional security, or null if not available.
 * @param {string} expiration - The expiration time for the token, e.g., "1h", "30m", etc.
 * @param {string} secret - The secret key used to sign the JWT.
 * @returns {string} The generated JWT token.
 */
function generateToken(
  user: UserToken,
  ip: string | null,
  expiration: string,
  secret: string,
): string {
  return jwt.sign(user, secret + (ip || ""), { expiresIn: expiration });
}

/**
 * Generates new access and refresh tokens for the user and stores them in the database.
 * If a session is not provided, a new session will be created.
 * @param {Omit<UserToken, "jti">} user - The user for whom tokens are being generated.
 * @param {string} ip - The request object containing the user's IP address.
 * @param {Session} [session] - Optional session to associate the tokens with. If not provided, a new session will be created.
 * @returns {Promise<{ accessToken: { token: string, authType: string } }>} An object containing the new access token.
 */
export async function generateUserTokens(
  user: Omit<UserToken, 'jti'>,
  ip: string,
  session?: Session,
): Promise<AccessResult> {
  const newId = new UUID();

  const userPermissions = await prisma.userPermissions.findMany({
    where: {
      userId: user.sub,
    },
    select: {
      Permission: {
        select: {
          code: true,
        },
      },
    },
  });

  const permissionCodes = userPermissions.map((perm) => perm.Permission.code);

  const newAccessToken = generateToken(
    {
      jti: newId,
      sub: user.sub,
      username: user.username,
      permissions: permissionCodes,
    },
    ip,
    config.ACCESS_TOKEN_EXPIRATION,
    config.ACCESS_TOKEN_SECRET,
  );
  const newRefreshToken = generateToken(
    {
      jti: newId,
      sub: user.sub,
      username: user.username,
    },
    ip,
    config.REFRESH_TOKEN_EXPIRATION,
    config.REFRESH_TOKEN_SECRET,
  );

  const databaseEntryExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

  if (!session) {
    // Create a session if not provided
    session = await prisma.session.create({
      data: {
        userId: user.sub,
        expiresAt: databaseEntryExpiresAt,
      },
    });
  }

  // Create the new tokens in the database
  if (session) {
    await prisma.token.create({
      data: {
        id: newId.toString(),
        sessionId: session.id,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  }

  // Return the new access token in a structured object
  return {
    accessToken: { token: newAccessToken, authType: 'bearer' },
  };
}

/**
 * Invalidates the session associated with the provided token by deleting the session and all associated tokens in the database.
 * @param {string} token - The token (either access or refresh) whose associated session should be invalidated.
 * @returns {Promise<void>} A promise that resolves once the session and tokens have been deleted.
 * @throws {Error} If there is an error during the session or token removal process.
 */
export async function invalidateSession(token: string): Promise<void> {
  const foundToken = await prisma.token.findFirst({
    where: {
      OR: [{ accessToken: token }, { refreshToken: token }],
    },
    include: {
      session: true,
    },
  });

  if (foundToken && foundToken.sessionId) {
    // Delete the session and all associated tokens
    await prisma.session.delete({
      where: {
        id: foundToken.sessionId,
      },
    });
  }
}

/**
 * Invalidates all tokens for a user by deleting their associated sessions in the database.
 * @param {string} userId - The unique identifier of the user whose tokens should be invalidated.
 * @returns {Promise<void>} A promise that resolves once the tokens have been invalidated.
 */
export async function invalidateAllTokensForUser(
  userId: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId: userId } });
}

/**
 * Retrieves the newest refresh token from the database for the same session as the provided access token.
 * @param {string} tokenBody - The access token for which the refresh token is being requested.
 * @returns {Promise<RefreshResult | null>} A promise that resolves to an object containing the refresh token if valid, or `null` if the access token is invalid or expired.
 * @throws {Error} If there is an error during token verification or database operations.
 */
export async function getRefreshToken(tokenBody: TokenRequestBody) {
  let user;

  try {
    user = jwt.verify(
      tokenBody.token,
      config.ACCESS_TOKEN_SECRET + tokenBody.ip,
      {
        ignoreExpiration: true,
      },
    );
  } catch (error) {
    // If there's an error in the token verification (e.g., invalid signature), return null
    console.error('Invalid token signature or other error:', error);
    return null;
  }
  if (!user) return null;

  const tokensInDb = await prisma.token.findUnique({
    where: { accessToken: tokenBody.token },
    include: {
      session: true,
    },
  });

  if (!tokensInDb) {
    // The access token was not found in the DB
    return null;
  }

  // Find the newest accessToken
  const newestTokens = await prisma.token.findFirst({
    where: { sessionId: tokensInDb.sessionId },
    orderBy: { createdAt: 'desc' },
  });

  // Check if the newest access token matches the provided access token
  if (newestTokens && newestTokens.accessToken === tokenBody.token) {
    // Gets the newest refresh token to return

    if (newestTokens.refreshToken) {
      // Return the new refresh token
      return {
        refreshToken: { token: newestTokens.refreshToken },
      };
    } else {
      // There was no available refresh token for that session
      return null;
    }
  } else {
    // The access token was either not found in the DB or not the newest.
    // All tokens for this user have been revoked
    await invalidateAllTokensForUser(tokensInDb.session.userId);
    return null;
  }
}

/**
 * Refreshes the user's tokens by verifying the provided refresh token, checking the latest token in the database,
 * and generating new tokens if the refresh token is valid.
 * @param {string} tokenBody - The refresh token to verify and use to generate new tokens.
 * @returns {Promise<object | null>} A promise that resolves to an object containing the new tokens if valid, or `null` if the token is invalid or expired.
 * @throws {Error} If there is an error during the token verification or database operations.
 */
export async function refreshUserTokens(
  tokenBody: TokenRequestBody,
): Promise<AccessResult | null> {
  // Verify the refresh token with the user's IP address as a secret key
  let userTemp: UserToken | null = null;
  try {
    userTemp = jwt.verify(
      tokenBody.token,
      config.REFRESH_TOKEN_SECRET  + tokenBody.ip,
    ) as unknown as UserToken;
  } catch {
    // Handle the verification failure gracefully
    return null;
  }

  // If the userTemp is valid and contains 'user', assign it to user
  let user: UserToken | null = null;

  if (userTemp) {
    user = userTemp; // Directly access the user property now that TypeScript knows the structure
  }

  if (!user) {
    return null; // Return null if the user is not found
  }

  // Fetch the tokens from the database based on the refresh token
  const tokensInDb = await prisma.token.findUnique({
    where: { refreshToken: tokenBody.token },
    include: {
      session: true,
    },
  });

  if (!tokensInDb || !tokensInDb.session) {
    return null; // Return null if the token or session is not found
  }

  const newestRefreshToken = await prisma.token.findFirst({
    where: { sessionId: tokensInDb.sessionId },
    orderBy: { createdAt: 'desc' },
  });

  // Check if the refresh token in the database matches the provided one
  if (
    newestRefreshToken &&
    newestRefreshToken.refreshToken === tokenBody.token
  ) {
    const result = generateUserTokens(
      {
        sub: user?.sub || '',
        username: user?.username || '',
      },
      tokenBody.ip,
      tokensInDb?.session,
    );
    return result;
  }

  // If the refresh token does not match, invalidate all tokens for the user
  await invalidateAllTokensForUser(tokensInDb.session.userId);
  return null;
}

// In-memory store for login attempts
const loginAttempts: LoginAttemptsCache = {};

const mutex = new Mutex();

/**
 * Generates a cache key based on the username and IP address.
 * @param {string} username - The username of the user attempting to log in.
 * @param {string} ipAddress - The IP address from which the login attempt is made.
 * @returns {string} The generated cache key in the format "username-ipAddress".
 */
function getCacheKey(username: string, ipAddress: string): string {
  return `${username}-${ipAddress}`;
}

/**
 * Adds a failed login attempt for a given username and IP address.
 * Tracks the time of the failed attempt and manages the attempt window.
 * @param {string} username - The username of the user attempting to log in.
//  * @param {string} ipAddress - The IP address from which the login attempt is made.
 * @returns {Promise<void>}
 */
async function addFailedAttempt(
  username: string,
  ipAddress: string,
): Promise<void> {
  const key = getCacheKey(username, ipAddress);

  const now = new Date();

  await mutex.runExclusive(() => {
    // Initialize the array if it doesn't exist
    if (!Object.prototype.hasOwnProperty.call(loginAttempts, key)) {
      loginAttempts[key] = []; // Create a new array for the key
    }

    // Filter out old attempts outside the time window
    loginAttempts[key] = loginAttempts[key].filter(
      (attemptTime) =>
        now.getTime() - attemptTime.getTime() <
        config.ATTEMPT_WINDOW_MINUTES * 60 * 1000,
    );

    // Add the new failed attempt
    loginAttempts[key].push(now);
  });
}

/**
 * Clears failed login attempts for a given username and IP address upon successful login.
 * @param {string} username - The username of the user who successfully logged in.
 * @param {string} ipAddress - The IP address from which the successful login is made.
 * @returns {Promise<void>}
 */
async function clearFailedAttempts(
  username: string,
  ipAddress: string,
): Promise<void> {
  const key = getCacheKey(username, ipAddress);

  await mutex.runExclusive(() => {
    // Clear the failed attempts for the username and IP
    if (Object.prototype.hasOwnProperty.call(loginAttempts, key)) {
      // eslint-disable-next-line security/detect-object-injection
      delete loginAttempts[key];
    }
  });
}
/**
 * Checks if an account is locked due to too many failed login attempts.
 * @param {string} username - The username of the user attempting to log in.
 * @param {string} ipAddress - The IP address from which the login attempt is made.
 * @returns {boolean} Returns true if the account is locked, otherwise false.
 */
function isAccountLocked(username: string, ipAddress: string): boolean {
  const key = getCacheKey(username, ipAddress);
  if (!Object.prototype.hasOwnProperty.call(loginAttempts, key)) {
    return false;
  }

  // Remove old attempts outside of the time window
  const now = new Date();
  if (Object.prototype.hasOwnProperty.call(loginAttempts, key)) {
    // eslint-disable-next-line security/detect-object-injection
    loginAttempts[key] = loginAttempts[key].filter(
      (attemptTime) =>
        now.getTime() - attemptTime.getTime() <
        config.ATTEMPT_WINDOW_MINUTES * 60 * 1000,
    );
  }

  // Check if the number of recent failed attempts exceeds the limit
  // eslint-disable-next-line security/detect-object-injection
  return loginAttempts[key].length >= config.MAX_FAILED_LOGIN_ATTEMPTS;
}

/**
 * Authenticates a user with a username and password.
 * The password is expected to be Base64-encoded, which is decoded during authentication.
 * @param {LoginRequestBody} userData - The user data containing the username and Base64-encoded password.
 * @returns {Promise<APIResponse<AccessResult>>} A promise that resolves with an API response containing
 * either authentication tokens upon success, or an error message if authentication fails.
 * @throws {Error} If an unexpected error occurs during the authentication process.
 */
export async function login(
  userData: LoginRequestBody,
): Promise<APIResponse<AccessResult>> {
  try {
    const validate = LoginSchema.validate({
      username: userData.username,
      password: userData.password,
    });
    if (validate.error) {
      return {
        status: Status.MissingCredentials,
        message: 'Some credentials are missing',
      };
    }

    // Check if the account should be locked due to too many failed attempts
    if (isAccountLocked(userData.username, userData.ip)) {
      return {
        status: Status.TooManyRequests,
        message: 'Too many failed login attempts. Please try again later.',
      };
    }

    // Decode password from Base64
    const decodedPassword = Buffer.from(userData.password, 'base64').toString();
    userData.password = decodedPassword;

    // Wrap passport authentication in a Promise to return an APIResponse
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      passport.authenticate(
        'local',
        async (err: any, user: Express.User | false) => {
          if (err || !user) {
            await addFailedAttempt(userData.username, userData.ip);
            return resolve({
              status: Status.InvalidCredentials,
              message: 'Wrong username or password',
            });
          }

          // Proceed with login and token generation
          try {
            await clearFailedAttempts(userData.username, userData.ip);
            const result: AccessResult = await generateUserTokens(
              {
                sub: user.id,
                username: user.username,
              },
              userData.ip,
            );

            resolve({
              data: result,
              status: Status.Success,
              message: 'Login successful',
            });
          } catch (tokenError) {
            console.error('Token generation error: ' + tokenError);
            resolve({
              status: Status.Failed,
              message: 'Failed to generate tokens',
            });
          }
        },
      )({ body: { username: userData.username, password: decodedPassword } });
    });
  } catch (error) {
    console.error('Login error: ' + error);
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end',
    };
  }
}

/**
 * Logs out a user by invalidating their session with the provided token.
 * @param {string} token - The authentication token provided by the user.
 * @returns {Promise<APIResponse>} A promise that resolves to an API response object containing the result of the logout operation.
 * @throws {Error} Throws an error if something goes wrong during the process, logging the issue and returning a generic error message.
 */
export async function logout(token: TokenRequestBody): Promise<APIResponse> {
  try {
    // Validate the token using TokenSchema
    const validate = TokenSchema.validate({ token: token.token });

    // If validation fails, return an error response
    if (validate.error) {
      return {
        status: Status.MissingCredentials,
        message: 'Some credentials are missing',
      };
    }

    // Proceed with the session invalidation process (e.g., invalidating the token)
    await invalidateSession(token.token);

    // Return a successful response
    return {
      // Assuming the data is not needed here
      status: Status.Success,
      message: 'Logout successful',
    };
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Logout error:', error);

    // Return a generic error message
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end',
    };
  }
}

/**
 * Logs out a user by invalidating their session with the provided token.
 * @param {string} token - The authentication token provided by the user.
 * @returns {Promise<APIResponse<AccessResult>>} A promise that resolves to an API response object containing the result of the logout operation.
 * @throws {Error} Throws an error if something goes wrong during the process, logging the issue and returning a generic error message.
 */
export async function accessToken(
  token: TokenRequestBody,
): Promise<APIResponse<AccessResult>> {
  try {
    // Validate the token using TokenSchema
    const validate = TokenSchema.validate({ token: token.token });

    // If validation fails, return an error response
    if (validate.error) {
      return {
        status: Status.MissingCredentials,
        message: 'Some credentials are missing',
      };
    }
    // Attempt to refresh tokens (replace this with the actual token refresh logic)
    const newTokens = await refreshUserTokens(token);

    // Check if new tokens were not returned (authorization failure)
    if (!newTokens) {
      return {
        status: Status.Unauthorized,
        message: 'Not authorized',
      };
    }

    // Successfully refreshed tokens, return them in the response
    return {
      data: newTokens,
      status: Status.Success,
      message: 'Tokens refreshed successfully',
    };
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Access token error:', error);

    // Return a generic error message
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end',
    };
  }
}

/**
 * Logs out a user by invalidating their session with the provided token.
 * @param {string} token - The authentication token provided by the user.
 * @returns {Promise<APIResponse<RefreshResult>>} A promise that resolves to an API response object containing the result of the logout operation.
 * @throws {Error} Throws an error if something goes wrong during the process, logging the issue and returning a generic error message.
 */
export async function refreshToken(
  token: TokenRequestBody,
): Promise<APIResponse<RefreshResult>> {
  try {
    // Validate the token using TokenSchema
    const validate = TokenSchema.validate({ token: token.token });

    // If validation fails, return an error response
    if (validate.error) {
      return {
        status: Status.MissingCredentials,
        message: 'Some credentials are missing' + validate.error.message,
      };
    }
    const tokens = await getRefreshToken(token);
    if (!tokens) {
      return {
        status: Status.Unauthorized,
        message: 'Not authorized',
      };
    }

    // Successfully refreshed tokens, return them in the response
    return {
      data: tokens,
      status: Status.Found,
      message: 'Token found',
    };
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Refresh token error:', error);

    // Return a generic error message
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end',
    };
  }
}
