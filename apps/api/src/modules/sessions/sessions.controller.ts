import { Controller, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';

@Controller('bookings/:bookingId/session')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.sessions.start(bookingId, user.userId);
  }

  @Post('end')
  end(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.sessions.end(bookingId, user.userId);
  }
}
