import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '../../generated/prisma-core';
import { STAFF_ROLES_KEY } from '../decorators/staff-roles.decorator';

/**
 * Layered on top of RolesGuard's @Roles(Role.ADMIN) check — narrows WHICH admin can do
 * WHAT. SUPER_ADMIN always passes, matching the frontend's canAccess() semantics. A staff
 * account with no staffRole assigned yet passes nothing gated by this guard.
 */
@Injectable()
export class StaffRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(STAFF_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const staffRole = user?.staffRole as StaffRole | null | undefined;
    if (staffRole === 'SUPER_ADMIN') {
      return true;
    }
    if (!staffRole || !required.includes(staffRole)) {
      throw new ForbiddenException('Insufficient admin permissions for this action');
    }
    return true;
  }
}
