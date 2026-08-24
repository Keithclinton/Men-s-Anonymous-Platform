import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '../../generated/prisma-core';

export const STAFF_ROLES_KEY = 'staffRoles';

/** Narrows an @Roles(Role.ADMIN) route to specific admin sub-roles. See staff-roles.guard.ts. */
export const StaffRoles = (...roles: StaffRole[]) => SetMetadata(STAFF_ROLES_KEY, roles);
