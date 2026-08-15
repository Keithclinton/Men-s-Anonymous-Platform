import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { BookingService } from '../booking/booking.service';

/**
 * Orchestrates chat/video: creates ephemeral rooms with the video provider, issues
 * short-lived join tokens, tracks metadata only — never message/video content.
 * See ARCHITECTURE.md §4, §6.
 *
 * No video vendor has been chosen yet (open decision — see §12: managed Daily.co/Twilio/
 * Agora vs. self-hosted mediasoup), so `roomRef` here is a placeholder identifier, not a
 * real joinable room. Swap `createRoom()` for a real provider SDK call once that's decided.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly booking: BookingService,
  ) {}

  async start(bookingId: string, actorId: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);

    if (session.booking.status !== 'CONFIRMED') {
      throw new ConflictException('Booking must be CONFIRMED before the session can start');
    }
    if (session.startedAt) {
      return session;
    }

    const paid = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCEEDED' },
    });
    if (!paid) {
      throw new ConflictException('Payment has not been confirmed for this booking yet');
    }

    return this.prisma.session.update({
      where: { bookingId },
      data: { startedAt: new Date(), roomRef: this.createRoom() },
    });
  }

  async end(bookingId: string, actorId: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);

    if (!session.startedAt) {
      throw new ConflictException('Session has not started yet');
    }
    if (session.endedAt) {
      return session;
    }

    const updated = await this.prisma.session.update({
      where: { bookingId },
      data: { endedAt: new Date() },
    });
    await this.booking.markCompleted(bookingId);
    return updated;
  }

  private createRoom(): string {
    // TODO: replace with a real provider room-creation call (Daily.co/Twilio/Agora/mediasoup).
    return `pending-provider-room-${randomUUID()}`;
  }

  private async requireSessionForParticipant(bookingId: string, actorId: string) {
    const session = await this.prisma.session.findUnique({
      where: { bookingId },
      include: { booking: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found for this booking');
    }
    if (session.booking.clientId !== actorId && session.booking.providerId !== actorId) {
      throw new ForbiddenException('Not a participant in this booking');
    }
    return session;
  }
}
