import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingModule } from '../booking/booking.module';
import { DailyGateway } from './gateways/daily.gateway';
import { MockVideoGateway } from './gateways/mock-video.gateway';
import { VIDEO_GATEWAY } from './gateways/video-gateway.interface';
import { SessionMessagesService } from './session-messages.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

const logger = new Logger('SessionsModule');

@Module({
  imports: [BookingModule],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionMessagesService,
    DailyGateway,
    MockVideoGateway,
    // Auto-selects on DAILY_API_KEY's presence, no separate mode flag needed — the moment a
    // real key is set, real rooms start getting created with zero other config changes.
    {
      provide: VIDEO_GATEWAY,
      useFactory: (config: ConfigService, daily: DailyGateway, mock: MockVideoGateway) => {
        if (config.get('DAILY_API_KEY')) {
          return daily;
        }
        logger.warn('DAILY_API_KEY not set — video sessions will use placeholder rooms, not real calls.');
        return mock;
      },
      inject: [ConfigService, DailyGateway, MockVideoGateway],
    },
  ],
  exports: [SessionsService],
})
export class SessionsModule {}
