import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
}
