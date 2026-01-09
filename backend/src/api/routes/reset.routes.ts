import { Router } from 'express';

import * as ResetController from '@controllers/reset.controller';

const router = Router();

// Updated endpoint path to `/reset`
router.put('/reset', ResetController.resetPassword);

export default router;
