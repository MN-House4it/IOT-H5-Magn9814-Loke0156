import Joi from 'joi';

import { UuidSchema } from './general.schema';

export const getLocationSchema = Joi.object({
  id: UuidSchema,
  name: Joi.string().min(3).max(255),
}).rename('id', 'uuid', { alias: true, ignoreUndefined: true });

export const createLocationSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
});

export const updateLocationSchema = Joi.array()
  .items(
    Joi.object({
      uuid: UuidSchema.required(),
      name: Joi.string().min(3).max(255).required(),
    }),
  )
  .required();
