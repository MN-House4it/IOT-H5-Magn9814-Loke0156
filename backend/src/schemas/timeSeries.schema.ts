import Joi from '@/joi';

const value = Joi.number();
const name = Joi.string().min(3).max(255);
const uuid = Joi.string().uuid();
const id = Joi.number().integer();
const identifier = Joi.string()
  .valid('CELSIUS', 'FAHRENHEIT', 'PERCENTAGE', 'ON_OFF')
  .insensitive();

const dataObject = {
  identifier,
  name,
  deviceId: uuid,
  locationId: uuid,
};

export const createSchema = Joi.array().items(
  Joi.object({ value, ...dataObject }).options({ presence: 'required' }),
);

export const searchParamsSchema = Joi.object({ id, ...dataObject });
