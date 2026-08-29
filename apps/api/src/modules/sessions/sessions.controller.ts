import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { SessionsService } from './sessions.service';

const MESSAGE_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@Controller('bookings/:bookingId/session')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.sessions.start(bookingId, user.userId);
  }

  /** Call this right before actually joining the call — tokens are minted fresh, not stored. */
  @Get('join')
  getJoin(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.sessions.getJoin(bookingId, user.userId);
  }

  @Get('messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Query('after') after?: string,
  ) {
    return this.sessions.listMessages(bookingId, user.userId, after);
  }

  @Throttle(MESSAGE_THROTTLE)
  @Post('messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.sessions.sendMessage(bookingId, user.userId, dto.body);
  }

  @Post('end')
  end(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.sessions.end(bookingId, user.userId);
  }
}
