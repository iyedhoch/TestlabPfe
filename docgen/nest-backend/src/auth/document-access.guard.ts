import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from './roles.enum';

@Injectable()
export class DocumentAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const rawType = request.query?.type;
    const type = Array.isArray(rawType) ? rawType[0] : rawType;
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : undefined;
    const role: Role = request.user?.role ?? Role.ADMIN;

    if (normalizedType === undefined || normalizedType === 'cahier') {
      if (role === Role.QA || role === Role.ADMIN) {
        return true;
      }

      throw new ForbiddenException(
        'Access denied: only QA or ADMIN can generate Cahier de recette',
      );
    }

    if (normalizedType === 'fsd') {
      if (role === Role.BA || role === Role.ADMIN) {
        return true;
      }

      throw new ForbiddenException(
        'Access denied: only BA or ADMIN can generate FSD',
      );
    }

    throw new ForbiddenException('Access denied: invalid document type');
  }
}