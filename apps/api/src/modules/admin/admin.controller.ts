import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma-core';
import { AdminService } from './admin.service';
import { BreakGlassDto } from './dto/break-glass.dto';
import { DecideVerificationDto } from './dto/decide-verification.dto';

/** Every route here is ADMIN-only — see AdminService's header comment on sub-role scoping. */
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('verifications')
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listPendingVerifications(user.userId);
  }

  @Get('verifications/:id')
  getDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.getVerificationDetail(id, user.userId);
  }

  @Post('verifications/:id/decision')
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DecideVerificationDto,
  ) {
    return this.admin.decideVerification(id, dto.decision, user.userId);
  }

  @Post('users/:userId/suspend')
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string) {
    return this.admin.suspendUser(userId, user.userId);
  }

  @Post('users/:userId/reinstate')
  reinstate(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string) {
    return this.admin.reinstateUser(userId, user.userId);
  }

  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.admin.listAuditLogs(limit ? Number(limit) : undefined);
  }

  @Post('vault/:pseudonymId/break-glass')
  breakGlass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pseudonymId') pseudonymId: string,
    @Body() dto: BreakGlassDto,
  ) {
    return this.admin.breakGlassIdentity(pseudonymId, user.userId, dto.reason);
  }
}
