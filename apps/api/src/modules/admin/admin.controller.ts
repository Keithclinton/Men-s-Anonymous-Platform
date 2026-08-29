import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRoles } from '../../common/decorators/staff-roles.decorator';
import { Role, UserStatus } from '../../generated/prisma-core';
import { AdminService } from './admin.service';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { BreakGlassDto } from './dto/break-glass.dto';
import { DecideVerificationDto } from './dto/decide-verification.dto';

/**
 * Every route here is ADMIN-only, further scoped per-route by staff sub-role — see
 * StaffRolesGuard and ARCHITECTURE.md §9a. SUPER_ADMIN always passes every check below.
 */
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @StaffRoles('COMPLIANCE_OFFICER')
  @Get('verifications')
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listPendingVerifications(user.userId);
  }

  @StaffRoles('COMPLIANCE_OFFICER')
  @Get('verifications/:id')
  getDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.getVerificationDetail(id, user.userId);
  }

  @StaffRoles('COMPLIANCE_OFFICER')
  @Post('verifications/:id/decision')
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DecideVerificationDto,
  ) {
    return this.admin.decideVerification(id, dto.decision, user.userId);
  }

  @StaffRoles('SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER')
  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
    @Query('take') take?: string,
  ) {
    return this.admin.listUsers({ search, role, status, take: take ? Number(take) : undefined });
  }

  @StaffRoles('SUPPORT_AGENT', 'STAFF_MODERATOR')
  @Post('users/:userId/suspend')
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string) {
    return this.admin.suspendUser(userId, user.userId);
  }

  @StaffRoles('SUPPORT_AGENT', 'STAFF_MODERATOR')
  @Post('users/:userId/reinstate')
  reinstate(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string) {
    return this.admin.reinstateUser(userId, user.userId);
  }

  @StaffRoles('SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER')
  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.admin.listAuditLogs(limit ? Number(limit) : undefined);
  }

  @StaffRoles('COMPLIANCE_OFFICER')
  @Post('vault/:pseudonymId/break-glass')
  breakGlass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pseudonymId') pseudonymId: string,
    @Body() dto: BreakGlassDto,
  ) {
    return this.admin.breakGlassIdentity(pseudonymId, user.userId, dto.reason);
  }

  /** SUPER_ADMIN only — the one non-DB-script way to grant/revoke another admin's scope. */
  @StaffRoles('SUPER_ADMIN')
  @Post('users/:userId/staff-role')
  assignStaffRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AssignStaffRoleDto,
  ) {
    return this.admin.assignStaffRole(userId, dto.staffRole, user.userId);
  }
}
