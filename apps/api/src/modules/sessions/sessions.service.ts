import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { BookingService } from '../booking/booking.service';
import { VIDEO_GATEWAY, VideoGateway } from './gateways/video-gateway.interface';

/**
 * Orchestrates chat/video: creates ephemeral rooms with the video provider, issues
 * short-lived join tokens, tracks metadata only — never message/video content.
 * See ARCHITECTURE.md §4, §6.
 *
 * CHAT sessions never touch the video gateway at all — modules/chat's Socket.IO gateway
 * handles that entirely separately and doesn't need a vendor room. Only VIDEO sessions get
 * a real (or, without DAILY_API_KEY set, mock) room — see sessions.module.ts.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly booking: BookingService,
    @Inject(VIDEO_GATEWAY) private readonly video: VideoGateway,
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

    let roomRef: string | null = null;
    if (session.channelType === 'VIDEO') {
      const room = await this.video.createRoom({ bookingId });
      roomRef = room.roomRef;
    }

    return this.prisma.session.update({
      where: { bookingId },
      data: { startedAt: new Date(), roomRef },
    });
  }

  /** Minted fresh right before joining, not stored — keeps token exposure short-lived. */
  async getJoinToken(bookingId: string, actorId: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);
    if (session.channelType !== 'VIDEO') {
      throw new ConflictException('This session is chat-only — use the chat gateway instead');
    }
    if (!session.roomRef) {
      throw new ConflictException('Start the session before requesting a join token');
    }
    return this.video.createJoinToken({ roomRef: session.roomRef, userId: actorId });
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
