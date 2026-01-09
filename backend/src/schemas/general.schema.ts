import Joi from '../joi';

export const UuidSchema = Joi.string()
  .uuid({ version: ['uuidv4', 'uuidv7'] })
  .label('id');
