import { axiosInstance } from './axiosInstance';

/**
 * Login the user.
 * @returns {Promise<string>} A promise that resolves to a token.
 */
export async function login(): Promise<string> {
  const response = await axiosInstance.post<{
    data: { accessToken: { token: string } };
  }>('/login', {
    username: 'admin',
    password: 'YWRtaW4=',
  });

  const token = response.data.data.accessToken.token;

  axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;

  return token;
}

/**
 * Logout the user.
 * @returns {Promise<void>} A promise that resolves to void.
 */
export async function logout(): Promise<void> {
  const authHeader = axiosInstance.defaults.headers.Authorization;

  if (!authHeader) return;
  if (typeof authHeader !== 'string') return;
  if (!authHeader.startsWith('Bearer ')) return;

  const token = authHeader.split(' ')[1];

  await axiosInstance.post('/logout', { token });
}

/**
 * Create a random string
 * @param {number} length - The length of the string to create.
 * @returns {string} A random string.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function createRandomString(length: number): Promise<string> {
  // eslint-disable-next-line no-secrets/no-secrets
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
