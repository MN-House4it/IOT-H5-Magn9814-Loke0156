/**
 * Represents the environment in which the application is running.
 */
export type NODE_ENV = 'development' | 'production' | 'test';

/**
 * Represents the port number on which the server will listen.
 * @see {@link isPort} For checking if a value is a valid port.
 */
export type Port = number;

/**
 * Type guard function to check if a value is a valid IP port.
 * @param {unknown} value - The value to check.
 * @returns {value is Port} True if the value is a valid port, otherwise false.
 */
export function isPort(value: unknown): value is Port {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 65535
  );
}

/**
 * Represents the configuration object for the application.
 * @property {NODE_ENV} NODE_ENV - The environment in which the application is running. See type {@link NODE_ENV}.
 * @property {Port} PORT - The port number on which the server will listen.
 * @see {@link isPort} For checking if a value is a valid port.
 * @property {number} RATE_LIMIT_COUNT - The maximum number of requests allowed within a specified time frame from a ip.
 * @property {number} RATE_LIMIT_RESET_SEC - The time frame (in minutes) for resetting the rate limit count.
 * @property {string} ACCESS_TOKEN_SECRET - The secret key used for signing access tokens.
 * @property {string} REFRESH_TOKEN_SECRET - The secret key used for signing refresh tokens.
 * @property {string} ACCESS_TOKEN_EXPIRATION - The expiration time for access tokens.
 * @property {string} REFRESH_TOKEN_EXPIRATION - The expiration time for refresh tokens.
 * @property {number} MAX_FAILED_LOGIN_ATTEMPTS - The maximum number of failed login attempts allowed.
 * @property {number} ATTEMPT_WINDOW_MINUTES - The time window (in minutes) for counting failed login attempts.
 */
export interface Config {
  NODE_ENV: NODE_ENV;
  PORT: Port;
  RATE_LIMIT_COUNT: number;
  RATE_LIMIT_RESET_SEC: number;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRATION: string;
  REFRESH_TOKEN_EXPIRATION: string;
  MAX_FAILED_LOGIN_ATTEMPTS: number;
  ATTEMPT_WINDOW_MINUTES: number;
}
