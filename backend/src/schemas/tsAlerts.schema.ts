import Joi from 'joi';

import { UuidSchema } from './general.schema';

export const tsAlertsSchema = Joi.object({ id: UuidSchema });
