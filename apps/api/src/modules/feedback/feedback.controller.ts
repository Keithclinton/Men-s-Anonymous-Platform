import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post('sessions/:sessionId/feedback')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedback.submit(sessionId, user.userId, dto);
  }

  @Get('providers/me/feedback')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.feedback.forProvider(user.userId);
  }
}
