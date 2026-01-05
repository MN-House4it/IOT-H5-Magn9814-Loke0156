import { Router } from 'express';

import { TransformedUser } from '@api-types/user.types';
import {
  createRecord,
  getAll,
  updateRecord,
} from '@controllers/default.controller';
import { transformUserData } from '@controllers/manage.controller';
import { verifyJWT } from '@middlewares/authenticate.mw';
import { isAllowed } from '@middlewares/isAllowed.mw';
import { transformPatch, transformPermissions } from '@middlewares/manage.mw';
import { validateParams } from '@middlewares/validate.mw';
import { User } from '@prisma/client';
import { getPermissionSchema } from '@schemas/permission.schema';
import {
  createUserSchema,
  getUserSchema,
  updateUserSchema,
} from '@schemas/user.schema';

const router = Router();

router.use('/', verifyJWT);

router.get(
  '/user',
  isAllowed(['administrator:users:view']),
  getAll<TransformedUser, User>(getUserSchema, 'user', transformUserData),
);
router.get(
  ['/permission', '/permission/:id'],
  isAllowed(['administrator:permission:view']),
  validateParams,
  getAll(getPermissionSchema, 'permission'),
);

router.post(
  '/user',
  isAllowed(['administrator:users:create']),
  transformPermissions,
  createRecord(createUserSchema, 'user'),
);
router.put(
  '/user/:id',
  isAllowed(['administrator:users:update']),
  updateRecord(updateUserSchema, 'user'),
);
router.patch(
  '/user/:id',
  isAllowed(['administrator:users:update']),
  transformPatch,
  updateRecord(createUserSchema, 'user'),
);

export default router;
