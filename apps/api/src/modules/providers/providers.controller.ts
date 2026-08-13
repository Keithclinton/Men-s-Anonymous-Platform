import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma-core';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Public()
  @Get()
  list(@Query('specialty') specialty?: string) {
    return this.providers.listBySpecialty(specialty);
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
