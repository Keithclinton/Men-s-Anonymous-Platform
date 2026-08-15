import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma-core';
import { CreateRevealGrantDto } from './dto/create-reveal-grant.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getById(user.userId);
  }

  @Roles(Role.CLIENT)
  @Get('me/reveals')
  listMyReveals(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listMyReveals(user.userId);
  }

  @Roles(Role.CLIENT)
  @Post('me/reveals')
  createReveal(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRevealGrantDto) {
    return this.users.createReveal(user.userId, dto);
  }

  @Roles(Role.CLIENT)
  @Post('me/reveals/:id/revoke')
  revokeReveal(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.revokeReveal(user.userId, id);
  }
}
