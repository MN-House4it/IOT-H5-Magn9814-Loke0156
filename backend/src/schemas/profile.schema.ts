import Joi from '@/joi';

export const ChangePasswordBase64Schema = Joi.object({
  newPassword: Joi.string().required(),
  oldPassword: Joi.string().required(),
});

export const ChangePasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
  oldPassword: Joi.string().min(8).required(),
});

export const jwtTokenSchema = Joi.object({
  token: Joi.string().required(),
});
