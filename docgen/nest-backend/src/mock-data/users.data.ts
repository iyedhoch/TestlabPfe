import { Role } from '../auth/roles.enum';

export interface MockUser {
  id: number;
  username: string;
  password: string;
  role: Role;
}

export const USERS: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: Role.ADMIN,
  },
  {
    id: 2,
    username: 'alice',
    password: 'alice123',
    role: Role.QA,
  },
  {
    id: 3,
    username: 'bob',
    password: 'bob123',
    role: Role.BA,
  },
];
