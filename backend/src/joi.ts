import Joi from 'joi/lib/index';

// import Joi from 'joi';

const defaultJoi = Joi.defaults((schema) =>
  schema.options({ abortEarly: false, errors: { wrap: { label: '[]' } } }),
);

export default defaultJoi;
