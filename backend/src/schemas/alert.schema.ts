import Joi from 'joi';

import { UuidSchema } from './general.schema';

const name = Joi.string().min(3).max(255);
const description = Joi.string().min(3).max(255);
const type = Joi.string().lowercase().trim().valid('info', 'warning', 'error');
const identifier = Joi.string()
  .lowercase()
  .trim()
  .valid('celsius', 'fahrenheit', 'percentage');

export const getAlertSchema = Joi.object({
  id: UuidSchema,
  name,
  type,
  identifier,
  deviceId: UuidSchema,
}).rename('id', 'uuid', { alias: true, ignoreUndefined: true });

export const createAlertSchema = Joi.object({
  name: name.required(),
  description: description.required(),
  threshold: Joi.number().required(),
  type: type.required(),
  identifier: identifier.required(),
  deviceId: UuidSchema.required(),
});

export const updateAlertSchema = Joi.array().items(
  Joi.object({
    uuid: UuidSchema.required(),
    name,
    description,
    threshold: Joi.number(),
    type,
    identifier,
    deviceId: UuidSchema,
  }),
);
