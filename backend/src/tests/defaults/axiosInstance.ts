import axios from 'axios';
import https from 'https';

export const axiosInstance = axios.create({
  baseURL: process.env.VITE_API_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  validateStatus: (status) => status <= 500,
});

export interface Response<T = any> {
  data: T;
}
