import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRoles } from '../../common/decorators/staff-roles.decorator';
import { Role } from '../../generated/prisma-core';
import { CreateSupportGroupDto } from './dto/create-support-group.dto';
import { SupportGroupsService } from './support-groups.service';

@Controller('support-groups')
export class SupportGroupsController {
  constructor(private readonly groups: SupportGroupsService) {}

  @Public()
  @Get()
  listUpcoming() {
    return this.groups.listUpcoming();
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.groups.listMine(user.userId);
  }

  @Roles(Role.ADMIN)
  @StaffRoles('STAFF_MODERATOR')
  @Post()
  create(@Body() dto: CreateSupportGroupDto) {
    return this.groups.create(dto);
  }

  @Post(':id/join')
  join(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groups.join(id, user.userId);
  }

  @Delete(':id/leave')
  leave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groups.leave(id, user.userId);
  }
}
