import Joi from '@/joi';

const uuid = Joi.string().uuid();
const name = Joi.string().min(3).max(255);
const frequency = Joi.number().max(2147483647);
const status = Joi.string()
  .valid('ACTIVE', 'INACTIVE', 'MAINTENANCE')
  .insensitive();

export const createSchema = Joi.object({
  uuid,
  name,
  frequency,
  locationUuid: uuid,
}).options({ presence: 'required' });

export const searchParamsSchema = Joi.object({
  id: uuid,
  uuid,
  name,
  Location: Joi.object({ uuid, name }),
  location: Joi.alternatives()
    .try(uuid, name)
    .custom((value: string) => ({
      key: uuid.validate(value).error ? 'name' : 'uuid',
      value,
    })),
  status,
})
  .rename('id', 'uuid', { ignoreUndefined: true, override: true })
  .custom(getSearchQuery);

export const updateSchema = Joi.array().items(
  Joi.object({
    uuid: uuid.required(),
    name,
    frequency,
    status,
    locationUuid: uuid,
  }),
);

// eslint-disable-next-line jsdoc/require-jsdoc
function getSearchQuery(value: { location?: string; Location: any }): object {
  if (value.location && typeof value.location === 'object') {
    const { key, value: locationValue } = value.location;
    delete value.location;
    value.Location = { [key]: locationValue };
  }

  return value;
}
