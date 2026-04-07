import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from './roles.enum';
import { USERS } from '../mock-data/users.data';
import type { MockUser } from '../mock-data/users.data';

@Injectable()
export class AuthService {
  private readonly users = USERS;

  login(username: string, password: string): Omit<MockUser, 'password'> {
    if (!username || !password) {
      throw new BadRequestException('username and password are required');
    }

    const user = this.users.find(
      (item) => item.username === username && item.password === password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sanitizeUser(user);
  }

  register(userDto: { username: string; password: string; role?: string }): {
    message: string;
    user: Omit<MockUser, 'password'>;
  } {
    if (!userDto?.username || !userDto?.password) {
      throw new BadRequestException('username and password are required');
    }

    const username = userDto.username.trim();
    const password = userDto.password.trim();

    if (!username || !password) {
      throw new BadRequestException('username and password cannot be empty');
    }

    const exists = this.users.some(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) {
      throw new BadRequestException('username already exists');
    }

    const newUser: MockUser = {
      id: this.users.length
        ? Math.max(...this.users.map((item) => item.id)) + 1
        : 1,
      username,
      password,
      role: this.normalizeRole(userDto.role),
    };

    this.users.push(newUser);

    return {
      message: 'User registered successfully',
      user: this.sanitizeUser(newUser),
    };
  }

  validateUser(userId: number): Omit<MockUser, 'password'> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid user id');
    }

    const user = this.users.find((item) => item.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: MockUser): Omit<MockUser, 'password'> {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  private normalizeRole(role?: string): Role {
    if (role === Role.QA || role === Role.BA || role === Role.ADMIN) {
      return role;
    }

    return Role.ADMIN;
  }
}
