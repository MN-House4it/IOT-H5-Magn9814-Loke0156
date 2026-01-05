import { Request, Response } from 'express';
import Joi from 'joi';

import { ExpressFunction } from '@api-types/general.types';
import { prismaModels } from '@prisma-instance';
import * as DefaultService from '@services/default.service';
import { getHttpStatusCode } from '@utils/Utils';

// eslint-disable-next-line jsdoc/require-jsdoc
function getModel(req: Request): prismaModels {
  return req.baseUrl.replace('/', '') as prismaModels;
}

interface IGetAllConfig {
  model?: prismaModels;
  prismaConfig?: RequestConfig;
}

/**
 * Controller to get all
 * @param {schema} schema - The schema to validate the query object.
 * @param {IGetAllConfig | prismaModels} configOrModel - The Prisma model to get the records from.
 * @returns {ExpressFunction} The response object
 */
export function getAll(
  schema: Joi.ObjectSchema,
  configOrModel?: IGetAllConfig | prismaModels,
): ExpressFunction {
  return async (req, res) => {
    let model: prismaModels | undefined;
    let prismaConfig: RequestConfig | undefined;

    if (typeof configOrModel === 'object') {
      model = configOrModel.model;
      prismaConfig = configOrModel.prismaConfig;
    } else model = configOrModel;

    model ??= getModel(req);

    const config = {
      where: req.query,
      ...prismaConfig,
    };

    const response = await DefaultService.getAll(model, schema, config);

    res.status(getHttpStatusCode(response.status)).json(response).end();
  };
}

/**
 * Controller to create a record
 * @param {schema} schema - The schema to validate the create object.
 * @param {prismaModels} model - The Prisma model to create the record with.
 * @returns {ExpressFunction} The response object
 */
export function createRecord(
  schema: Joi.ObjectSchema | Joi.ArraySchema,
  model?: prismaModels,
): ExpressFunction {
  return async (req, res) => {
    model ??= getModel(req);

    const response = await DefaultService.create(model, req.body, schema);

    res.status(getHttpStatusCode(response.status)).json(response).end();
  };
}

/**
 * Controller to update a record
 * @param {Joi.ObjectSchema | Joi.ArraySchema} schema - The schema to validate the update object.
 * @param {prismaModels} model - The Prisma model to update the record in.
 * @returns {ExpressFunction} The response object
 */
export function updateRecord(
  schema: Joi.ObjectSchema | Joi.ArraySchema,
  model?: prismaModels,
): ExpressFunction {
  return async (req, res) => {
    const id = (req.params.id || req.query.id) as string;

    model ??= getModel(req);

    const response = await DefaultService.update(model, id, req.body, schema);

    res.status(getHttpStatusCode(response.status)).json(response).end();
  };
}

/**
 * Controller to delete a record
 * @param {"id" | "uuid"} [idType='id'] - Default is id. Indecate if id is a id or a uuid.
 * @param {prismaModels} [model] - The Prisma model to delete the record from.
 * @returns {ExpressFunction} The response object
 */
export function deleteRecord(
  idType: 'id' | 'uuid' = 'id',
  model?: prismaModels,
): ExpressFunction {
  return async (req, res) => {
    const id = (req.params.id || req.query.id || req.query.uuid) as string;

    model ??= getModel(req);

    const response = await DefaultService.deleteRecord(model, id, idType);

    res.status(getHttpStatusCode(response.status)).json(response).end();
  };
}

/**
 * Controller to delete a record
 * @param {Joi.ObjectSchema} schema - The schema to validate the update object.
 * @param {prismaModels} model - The Prisma model to delete the record from.
 * @returns {ExpressFunction} The response object
 */
export function softDeleteRecord(
  schema: Joi.ArraySchema,
  model?: prismaModels,
): ExpressFunction {
  return async (req, res) => {
    const id = (req.params.id || req.query.id) as string;

    model ??= getModel(req);

    const response = await DefaultService.update(
      model,
      id,
      { active: false },
      schema,
    );

    res.status(getHttpStatusCode(response.status)).json(response).end();
  };
}
