import { Prisma } from '@prisma/client';

import { Permission } from './permission.types';

interface IBasicUser extends BasicUser {
  id: string;
  active: boolean;
}

export interface User extends IBasicUser {
  UserPermissions?: UserPermission[];
}

export interface BasicUser {
  initials: string;
  name: string;
  email: string;
  username: string;
}

interface UserPermission {
  Permission: Permission;
  assignedBy: string;
}

export interface TransformedUser extends IBasicUser {
  UserPermissions: Prisma.UserPermissionsUncheckedCreateWithoutUserInput[] &
    {
      code: string;
      description: string;
    }[]; // Match the mapped structure
}
