import * as dotenv from 'dotenv';
import path from 'path';

import { Config, NODE_ENV, isPort } from '@api-types/config.types';

dotenv.config({ path: path.join(__dirname, '../', '.env') });

/**
 * The configuration object for the application.
 * @see {@link Config} For the type definition.
 */
const config: Config = {
  NODE_ENV: (process.env.NODE_ENV as NODE_ENV) || 'development',
  PORT: isPort(Number(process.env.PORT)) ? Number(process.env.PORT) : 3001,
  RATE_LIMIT_COUNT: Number(process.env.RATE_LIMIT_COUNT) || 4,
  RATE_LIMIT_RESET_SEC: Number(process.env.RATE_LIMIT_RESET_SEC) || 1,
  ACCESS_TOKEN_SECRET:
    process.env.ACCESS_TOKEN_SECRET ||
    'this_is_a_super_secret_key_for_the_access_token_please_change_it',
  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET ||
    'this_is_a_super_secret_key_for_the_refresh_token_please_change_it',
  ACCESS_TOKEN_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION || '5m',
  REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || '1h',
  MAX_FAILED_LOGIN_ATTEMPTS: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5,
  ATTEMPT_WINDOW_MINUTES: Number(process.env.ATTEMPT_WINDOW_MINUTES) || 15,
};

export default config;
