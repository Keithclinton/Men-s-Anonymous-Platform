import { IsIn, IsOptional } from 'class-validator';

export class AssignStaffRoleDto {
  /** Omit (or null) to clear an admin's staff scope, revoking all StaffRolesGuard-gated access. */
  @IsOptional()
  @IsIn(['SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER', 'SUPER_ADMIN'])
  staffRole?: 'SUPPORT_AGENT' | 'STAFF_MODERATOR' | 'COMPLIANCE_OFFICER' | 'SUPER_ADMIN' | null;
}
