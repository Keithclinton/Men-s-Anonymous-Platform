import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchExpiryQueue } from './match-expiry.queue';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [BookingModule, NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchExpiryQueue],
  exports: [MatchingService],
})
export class MatchingModule {}
