import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderKind, Role } from '../../generated/prisma-core';
import { UsersService } from '../users/users.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Get()
  list(@Query('specialty') specialty?: string, @Query('kind') kind?: ProviderKind) {
    return this.providers.listBySpecialty(specialty, kind);
  }

  @Roles(Role.PROVIDER)
  @Get('me/reveals')
  listReveals(@CurrentUser() user: AuthenticatedUser) {
    return this.users.listRevealsForProvider(user.userId);
  }

  // Literal routes ('me/...') must be declared before ':id'-shaped ones below, or Nest
  // would match e.g. GET /providers/me/slots as :id="me" first.
  @Roles(Role.PROVIDER)
  @Get('me/slots')
  listMySlots(@CurrentUser() user: AuthenticatedUser) {
    return this.providers.listMySlots(user.userId);
  }

  @Public()
  @Get(':id/slots')
  listProviderSlots(@Param('id') id: string) {
    return this.providers.listOpenSlots(id);
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.providers.getPublicProfile(id);
  }

  @Roles(Role.PROVIDER)
  @Post('me/verification')
  submitVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.providers.submitVerification(user.userId, dto);
  }

  @Roles(Role.PROVIDER)
  @Get('me/verification')
  getMyVerificationStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.providers.getMyVerificationStatus(user.userId);
  }

  @Roles(Role.PROVIDER)
  @Post('me/slots')
  createSlot(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSlotDto) {
    return this.providers.createSlot(user.userId, dto);
  }

  @Roles(Role.PROVIDER)
  @Delete('me/slots/:slotId')
  deleteSlot(@CurrentUser() user: AuthenticatedUser, @Param('slotId') slotId: string) {
    return this.providers.deleteSlot(user.userId, slotId);
  }

  @Roles(Role.PROVIDER)
  @Put('me')
  publishProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertProfileDto) {
    return this.providers.publishProfile(user.userId, dto);
  }

  @Roles(Role.PROVIDER)
  @Patch('me/availability')
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.providers.updateAvailability(user.userId, dto.availability);
  }
}
