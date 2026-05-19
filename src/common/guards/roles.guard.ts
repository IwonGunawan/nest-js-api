import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Kalau endpoint tidak punya @Roles(), semua user yang login bisa akses
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // users_level: '0' = admin, '1' = petugas
    const roleMap: Record<string, Role> = {
      '0': 'admin',
      '1': 'petugas',
    };

    return requiredRoles.includes(roleMap[user.level]);
  }
}
