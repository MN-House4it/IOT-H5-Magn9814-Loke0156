import Joi from '@/joi';

export const getPermissionSchema = Joi.object({
  id: Joi.number().required(),
});
