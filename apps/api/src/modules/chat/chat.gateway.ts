import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';

interface JoinPayload {
  bookingId: string;
}

interface MessagePayload {
  bookingId: string;
  text: string;
}

const MAX_MESSAGE_LENGTH = 4000;

function room(bookingId: string): string {
  return `booking:${bookingId}`;
}

/**
 * 1:1 chat for a booking's two participants. Deliberately stateless beyond room membership
 * held on the socket itself — message *content* is relayed only, never written to Postgres
 * or anywhere else. See ARCHITECTURE.md §6: "don't persist chat content server-side, only
 * metadata." Auth and cross-instance delivery are handled by WsJwtAdapter, not here.
 *
 * Reconnects: Vercel Function WebSocket connections close every 5 minutes on the Hobby plan
 * (https://vercel.com/docs/functions/websockets#handle-disconnections-and-reconnects) — the
 * client is expected to reconnect and re-emit `join` for whatever booking it's viewing.
 * Nothing here assumes a connection stays open longer than that.
 */
@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: CorePrismaService) {}

  handleConnection(client: Socket): void {
    client.data.joinedBookingIds = new Set<string>();
    this.logger.log(`Connected: ${client.data.userId ?? client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Disconnected: ${client.data.userId ?? client.id}`);
    const joined: Set<string> | undefined = client.data.joinedBookingIds;
    if (joined) {
      for (const bookingId of joined) {
        client.to(room(bookingId)).emit('presence', { userId: client.data.userId, online: false });
      }
    }
  }

  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    const bookingId = payload?.bookingId;
    if (!bookingId) {
      return { ok: false, error: 'bookingId is required' };
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return { ok: false, error: 'Booking not found' };
    }
    const userId = client.data.userId as string;
    if (booking.clientId !== userId && booking.providerId !== userId) {
      return { ok: false, error: 'Not a participant in this booking' };
    }
    if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
      return { ok: false, error: 'This booking is not open for chat' };
    }

    await client.join(room(bookingId));
    (client.data.joinedBookingIds as Set<string>).add(bookingId);
    client.to(room(bookingId)).emit('presence', { userId, online: true });
    return { ok: true };
  }

  @SubscribeMessage('leave')
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinPayload): void {
    const bookingId = payload?.bookingId;
    if (!bookingId) return;
    void client.leave(room(bookingId));
    (client.data.joinedBookingIds as Set<string> | undefined)?.delete(bookingId);
    client.to(room(bookingId)).emit('presence', { userId: client.data.userId, online: false });
  }

  @SubscribeMessage('message')
  onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessagePayload,
  ): { ok: boolean; error?: string } {
    const { bookingId, text } = payload ?? ({} as MessagePayload);
    const joined: Set<string> | undefined = client.data.joinedBookingIds;
    if (!bookingId || !joined?.has(bookingId)) {
      return { ok: false, error: 'Join this booking’s room before sending messages' };
    }
    const trimmed = (text ?? '').trim();
    if (!trimmed) {
      return { ok: false, error: 'text is required' };
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: `text must be ${MAX_MESSAGE_LENGTH} characters or fewer` };
    }

    this.server.to(room(bookingId)).emit('message', {
      bookingId,
      senderId: client.data.userId,
      text: trimmed,
      sentAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  @SubscribeMessage('typing')
  onTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinPayload): void {
    const bookingId = payload?.bookingId;
    const joined: Set<string> | undefined = client.data.joinedBookingIds;
    if (!bookingId || !joined?.has(bookingId)) return;
    client.to(room(bookingId)).emit('typing', { bookingId, userId: client.data.userId });
  }
}
