/* eslint-disable security/detect-object-injection */
import { IAPIResponse, Status } from '@api-types/general.types';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { capitalize } from '@utils/Utils';

const defaultOmit = {
  createdAt: true,
  updatedAt: true,
};

const prisma = new PrismaClient({
  omit: {
    alert: defaultOmit,
    device: { ...defaultOmit, token: true },
    location: defaultOmit,
    permission: defaultOmit,
    user: defaultOmit,
    permissionGroup: defaultOmit,
  },
});

export default prisma;

export type prismaModels = Uncapitalize<Prisma.ModelName>;
/**
 * Function to handle error responses
 * @param {PrismaClientKnownRequestError} err - The error object.
 * @param {prismaModels} model - The model that caused the error.
 * @param {keyof typeof Status} operation - The operation that caused the error.
 * @returns {IAPIResponse} An object containing the status and message.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function errorResponse(
  err: PrismaClientKnownRequestError,
  model: prismaModels,
  operation: keyof typeof Status,
): Promise<IAPIResponse> {
  if (err.name == 'PrismaClientValidationError') {
    return {
      status: Status.MissingDetails,
      message: 'Invalid input',
    };
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    operation in Status
  ) {
    switch (err.code) {
      case 'P2002':
        return {
          status: Status[operation],
          message: `${capitalize(model)} already exists`,
        };

      case 'P2025':
        return {
          status: Status[operation],
          message: `${capitalize(model)} not found`,
        };

      case 'P2014':
        return {
          status: Status[operation],
          message: 'Relation deletion error',
        };
    }
  }

  return {
    status: Status[operation],
    message: 'Error',
  };
}
