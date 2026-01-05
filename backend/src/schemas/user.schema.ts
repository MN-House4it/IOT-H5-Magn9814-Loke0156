import Joi from '@/joi';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'admin').required(),
});

export const getUserSchema = Joi.object({
  id: Joi.number().required(),
});

export const updateUserSchema = Joi.object({
  id: Joi.number().required(),
  email: Joi.string().email(),
  password: Joi.string().min(8),
  role: Joi.string().valid('user', 'admin'),
});
