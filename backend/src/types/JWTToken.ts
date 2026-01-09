import { UUID } from 'bson';

export interface UserToken {
  sub: string;
  jti: UUID;
  username: string;
  permissions?: string[];
}
