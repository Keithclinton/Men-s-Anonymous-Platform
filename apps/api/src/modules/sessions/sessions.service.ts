import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { BookingService } from '../booking/booking.service';
import { VIDEO_GATEWAY, VideoGateway } from './gateways/video-gateway.interface';
import { SessionMessagesService } from './session-messages.service';

/** Session length + this buffer is how long a chat's messages outlive it in Redis. */
const MESSAGE_TTL_BUFFER_SEC = 15 * 60;

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
    private readonly messages: SessionMessagesService,
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

  /**
   * Unified join payload for both channel types — see docs/backend-realtime-api.md. Video
   * gets a fresh vendor join URL (minted right before joining, never stored); chat just
   * confirms the room is open, since the chat screen talks to the REST relay below.
   */
  async getJoin(bookingId: string, actorId: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);
    if (!session.startedAt) {
      throw new ConflictException('Start the session before requesting a join link');
    }

    if (session.channelType === 'VIDEO') {
      if (!session.roomRef) {
        throw new ConflictException('Start the session before requesting a join link');
      }
      const { url } = await this.video.createJoinToken({ roomRef: session.roomRef, userId: actorId });
      return {
        bookingId,
        sessionId: session.id,
        channelType: session.channelType,
        token: null,
        wsPath: null,
        joinUrl: url,
      };
    }

    return {
      bookingId,
      sessionId: session.id,
      channelType: session.channelType,
      token: null,
      wsPath: null,
      joinUrl: null,
    };
  }

  async listMessages(bookingId: string, actorId: string, after?: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);
    if (!session.startedAt) {
      throw new ConflictException('Session has not started yet');
    }
    return this.messages.list(session.id, after);
  }

  async sendMessage(bookingId: string, actorId: string, body: string) {
    const session = await this.requireSessionForParticipant(bookingId, actorId);
    if (!session.startedAt) {
      throw new ConflictException('Session has not started yet');
    }
    if (session.endedAt) {
      throw new ConflictException('This session has ended');
    }
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('body must not be empty');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: { providerProfile: true },
    });
    const senderHandle = sender?.providerProfile?.displayName || sender?.username || 'Someone';

    const message = {
      id: randomUUID(),
      bookingId,
      sessionId: session.id,
      senderId: actorId,
      senderHandle,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    const ttlSeconds = session.booking.durationMin * 60 + MESSAGE_TTL_BUFFER_SEC;
    await this.messages.append(message, ttlSeconds);
    return message;
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
    await this.messages.clear(session.id);
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
