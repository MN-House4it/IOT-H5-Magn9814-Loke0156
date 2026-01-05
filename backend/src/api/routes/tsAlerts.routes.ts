import { Router } from 'express';

import { getAll } from '@controllers/default.controller';
import { verifyJWT } from '@middlewares/authenticate.mw';
import { isAllowed } from '@middlewares/isAllowed.mw';
import { tsAlertsSchema } from '@schemas/tsAlerts.schema';

const router = Router();

router.use('/', verifyJWT);

router.get(
  '/',
  isAllowed('alert:view'),
  getAll(tsAlertsSchema, 'timeseriesAlert'),
);

export default router;
