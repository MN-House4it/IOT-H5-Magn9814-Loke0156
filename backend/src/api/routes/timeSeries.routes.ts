import { Router } from 'express';

import { createRecord, getAll } from '@controllers/default.controller';
import { verifyJWT } from '@middlewares/authenticate.mw';
import { useApiKey } from '@middlewares/device.mw';
import { isAllowed } from '@middlewares/isAllowed.mw';
import { addDeviceDetails } from '@middlewares/timeSeries.mw';
import { createSchema, searchParamsSchema } from '@schemas/timeSeries.schema';

const router = Router();

router.post(
  '/',
  useApiKey,
  addDeviceDetails,
  createRecord(createSchema, 'timeseries'),
);

router.use('/', verifyJWT);

router.get(
  '/',
  isAllowed('data:view'),
  getAll(searchParamsSchema, 'timeseries'),
);

export default router;
