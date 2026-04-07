import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../roles.enum';

type RequestUser = {
  id: number;
  role: Role;
};

@Injectable()
export class FakeAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const path = request.path as string;

    if (isPublic || this.isPublicPath(path)) {
      return true;
    }

    if (request.user) {
      return true;
    }

    // TODO: Replace x-user-id header-based auth with JWT validation.
    const userIdHeader = request.headers['x-user-id'];
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    if (!rawUserId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    const userId = Number(rawUserId);
    const user = this.authService.validateUser(userId);
    const resolvedRole = this.resolveRole(request.headers['x-role']);
    request.user = {
      id: user.id,
      role: resolvedRole,
    } satisfies RequestUser;

    return true;
  }

  private resolveRole(rawRole: string | string[] | undefined): Role {
    const roleValue = Array.isArray(rawRole) ? rawRole[0] : rawRole;

    if (roleValue === Role.QA || roleValue === Role.BA || roleValue === Role.ADMIN) {
      return roleValue;
    }

    return Role.ADMIN;
  }

  private isPublicPath(path: string): boolean {
    return (
      path.startsWith('/api/auth') ||
      path.startsWith('/swagger') ||
      path.startsWith('/swagger-ui') ||
      path.startsWith('/v3/api-docs')
    );
  }
}
