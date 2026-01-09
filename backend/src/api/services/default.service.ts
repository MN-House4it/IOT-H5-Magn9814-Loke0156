/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Joi from 'joi';

import { APIResponse, IAPIResponse, Status } from '@api-types/general.types';
import prisma, { errorResponse, prismaModels } from '@prisma-instance';
import { Prisma } from '@prisma/client';
import { UuidSchema } from '@schemas/general.schema';
import { capitalize } from '@utils/Utils';

/**
 * Service to get all records from a collection
 * @async
 * @param {prismaModels} prismaModel - The Prisma model to get the records from.
 * @param {Joi.ObjectSchema} schema - The schema to validate the query object.
 * @param {Record<string, unknown>} config - The parameters to filter the records by.
 * @returns {Promise<APIResponse<any>>} A promise that resolves to an object containing the data, status, and message.
 */
export async function getAll<T = any>(
  prismaModel: prismaModels,
  schema: Joi.ObjectSchema,
  config: Record<string, unknown> = {},
): Promise<APIResponse<T[]>> {
  const { err, prismaType, validatedData } = Validate(
    prismaModel,
    config.where,
    schema,
  );
  if (err) return err;

  config.where = validatedData;

  const results = await prismaType.findMany(config) as T[];

  return {
    data: results,
    status: Status.Found,
    message: `${capitalize(prismaModel)}(s) found`,
  };
}

/**
 * Service to create a record
 * @async
 * @param {prismaModels} prismaModel - The Prisma model to create the record with.
 * @param {any} data - The data to create a record with.
 * @param {Joi.ObjectSchema | Joi.ArraySchema} schema - The schema to validate the data against.
 * @returns {Promise<IAPIResponse>} A promise that resolves to an object containing the record data, status, and message.
 */
export async function create(
  prismaModel: prismaModels,
  data: unknown,
  schema: Joi.ObjectSchema | Joi.ArraySchema,
): Promise<IAPIResponse> {
  const { err, prismaType, validatedData } = Validate(
    prismaModel,
    data,
    schema,
  );
  if (err) return err;

  const query = Array.isArray(validatedData) ? 'createMany' : 'create';

  try {
    // eslint-disable-next-line security/detect-object-injection
    await prismaType[query]({ data: validatedData });

    return {
      status: Status.Created,
      message: `Created new ${prismaModel}`,
    };
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    return errorResponse(prismaError, prismaModel, 'CreationFailed');
  }
}

/**
 * Service to update a record
 * @async
 * @param {prismaModels} prismaModel - The Prisma model to update the record from.
 * @param {string} id - The id of the record to update.
 * @param {unknown} data - The data to update the record with.
 * @param {Joi.ObjectSchema} schema - The schema to validate the data against.
 * @returns {Promise<APIResponse>} A promise that resolves to an object containing the record data, status, and message.
 */
export async function update(
  prismaModel: prismaModels,
  id: string,
  data: unknown,
  schema: Joi.ObjectSchema | Joi.ArraySchema,
): Promise<APIResponse> {
  const { err, prismaType, validatedData } = Validate(
    prismaModel,
    data,
    schema,
  );
  if (err) return err;

  try {
    if (Array.isArray(validatedData)) {
      const transactionCollection = [];
      for (const item of validatedData) {
        const { uuid, ...restItem } = item;
        transactionCollection.push(
          prismaType.update({ where: { uuid }, data: restItem }),
        );
      }
      await prisma.$transaction(transactionCollection);
    } else {
      await prismaType.update({ where: { id }, data: validatedData });
    }

    return {
      status: Status.Updated,
      message: `Updated ${prismaModel}`,
    };
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    return errorResponse(prismaError, prismaModel, 'UpdateFailed');
  }
}

/**
 * Service to delete a record
 * @async
 * @param {prismaModels} prismaModel - The Prisma model to delete the record from.
 * @param {string} id - The id of the record to delete.
 * @param {"id" | "uuid"} [idType] - Default is id. Indecate if id is a id or a uuid.
 * @returns {Promise<IAPIResponse>} A promise that resolves to an object containing the record data, status, and message.
 */
export async function deleteRecord(
  prismaModel: prismaModels,
  id: string,
  idType: 'id' | 'uuid' = 'id',
): Promise<IAPIResponse> {
  const { err, prismaType } = Validate(prismaModel, id, UuidSchema);
  if (err) return err;

  try {
    if (idType === 'id') {
      await prismaType.delete({ where: { id } });
    } else {
      await prismaType.delete({ where: { uuid: id } });
    }

    return {
      status: Status.Deleted,
      message: `Deleted ${prismaModel}`,
    };
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    return errorResponse(prismaError, prismaModel, 'DeleteFailed');
  }
}

interface IValidateResponse {
  err?: IAPIResponse;
  prismaType?: any;
  validatedData?: unknown;
}

/**
 * Function to validate the data
 * @param {prismaModels} prismaModel - The Prisma model to validate the data against.
 * @param {unknown} data - The data to validate.
 * @param {Joi.AnySchema} schema - The schema to validate the data against.
 * @returns {IValidateResponse} An object containing
 */
export function Validate(
  prismaModel: prismaModels,
  data?: unknown,
  schema?: Joi.AnySchema,
): IValidateResponse {
  if (!Object.prototype.hasOwnProperty.call(prisma, prismaModel)) {
    return {
      err: {
        status: Status.Failed,
        message: `Model '${prismaModel}' was not found in prisma`,
      },
    };
  }
  // eslint-disable-next-line security/detect-object-injection
  const prismaType = prisma[prismaModel];

  if (!prismaType) {
    return {
      err: {
        status: Status.NotFound,
        message: `Database collection not found`,
      },
    };
  }

  if (schema) {
    const { value, error } = schema.validate(data);

    if (error) {
      return {
        err: {
          status: Status.InvalidDetails,
          message: error.message,
        },
      };
    }

    data = value;
  }

  return {
    err: undefined,
    prismaType,
    validatedData: data,
  };
}
