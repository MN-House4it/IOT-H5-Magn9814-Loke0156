// types.d.ts
import { User as PrismaUser } from '@prisma/client';

declare global {
  interface RequestConfig {
    [x: string]: unknown;
  }

  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
    interface User extends PrismaUser {}

    interface Request {
      config?: RequestConfig;
    }
  }
}
