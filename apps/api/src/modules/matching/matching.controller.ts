import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalSecretGuard } from '../../common/guards/internal-secret.guard';
import { Role } from '../../generated/prisma-core';
import { RequestMatchDto } from './dto/request-match.dto';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Roles(Role.CLIENT)
  @Post('request')
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestMatchDto) {
    return this.matching.requestMatch(user.userId, dto);
  }

  @Roles(Role.PROVIDER)
  @Post(':bookingId/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.matching.accept(bookingId, user.userId);
  }

  @Roles(Role.PROVIDER)
  @Post(':bookingId/decline')
  decline(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.matching.decline(bookingId, user.userId);
  }

  /** Triggered by apps/worker when a request's 15-minute accept/decline window elapses. */
  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('internal/expire')
  expire(@Body() body: { bookingId: string }) {
    return this.matching.expireIfStillRequested(body.bookingId);
  }
}
