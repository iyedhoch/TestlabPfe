import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from './roles.enum';

type JwtUser = {
  id: number;
  role: Role;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'];
    const rawAuthorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!rawAuthorization || !rawAuthorization.startsWith('Bearer ')) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = JwtUser>(
    err: unknown,
    user: JwtUser | undefined,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || info || !user) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Invalid JWT token');
    }

    return user as unknown as TUser;
  }
}