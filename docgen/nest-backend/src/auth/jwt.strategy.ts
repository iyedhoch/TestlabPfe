import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from './roles.enum';

interface JwtPayload {
  userId: number;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'dev-secret-key',
    });
  }

  validate(payload: JwtPayload): { id: number; role: Role } {
    const userId = Number(payload?.userId);
    const role = payload?.role;

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid JWT userId');
    }

    if (role !== Role.QA && role !== Role.BA && role !== Role.ADMIN) {
      throw new UnauthorizedException('Invalid JWT role');
    }

    return {
      id: userId,
      role,
    };
  }
}