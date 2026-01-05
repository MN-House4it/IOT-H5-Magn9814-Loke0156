import { NextFunction, Request, Response } from 'express';
import { Query } from 'express-serve-static-core';
import { WebSocket } from 'ws';

export enum Status {
  Unauthorized = 'Unauthorized',
  Forbidden = 'Forbidden',
  Success = 'Success',
  Failed = 'Failed',
  Found = 'Found',
  NotFound = 'NotFound',
  Created = 'Created',
  CreationFailed = 'CreationFailed',
  Deleted = 'Deleted',
  DeleteFailed = 'DeletionFailed',
  Updated = 'Updated',
  UpdateFailed = 'UpdateFailed',
  MissingDetails = 'MissingDetails',
  InvalidDetails = 'InvalidDetails',
  MissingCredentials = 'MissingCredentials',
  InvalidCredentials = 'InvalidCredentials',
  TooManyRequests = 'TooManyRequests',

  WsUnauthorized = 'Unauthorized WebSocket',
  WsClose = 'Close WebSocket',
  WsFailed = 'Failed WebSocket',
  WsForbidden = 'Forbidden WebSocket',
  wsInvalidDetails = 'Invalid Details WebSocket',
  ApiKeyResetFailed = 'ApiKeyResetFailed',
}
export interface APIResponse<T = null | undefined> {
  status: Status;
  message?: string;
  data?: T | null;
}

export interface IAPIResponse {
  status: Status;
  message?: string;
}

export type ExpressFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export type WebsocketFunction = (
  ws: WebSocket,
  req: Request,
) => Promise<void> | void;

export type TypedQuery<T> = Partial<T> & Query;
