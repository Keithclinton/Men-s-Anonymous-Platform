import { Injectable, Logger } from '@nestjs/common';
import {
  CreateJoinTokenParams,
  CreateJoinTokenResult,
  CreateRoomParams,
  CreateRoomResult,
  VideoGateway,
} from './video-gateway.interface';

/**
 * Used automatically whenever DAILY_API_KEY isn't set — see sessions.module.ts. Preserves
 * the pre-existing `pending-provider-room-...` placeholder shape so nothing downstream (or
 * any frontend already built against it) breaks while no real video vendor is configured.
 */
@Injectable()
export class MockVideoGateway implements VideoGateway {
  private readonly logger = new Logger(MockVideoGateway.name);

  async createRoom(params: CreateRoomParams): Promise<CreateRoomResult> {
    const roomRef = `pending-provider-room-${params.bookingId}`;
    this.logger.warn(`[no DAILY_API_KEY] Mock room ${roomRef} — not a real joinable call.`);
    return { roomRef };
  }

  async createJoinToken(params: CreateJoinTokenParams): Promise<CreateJoinTokenResult> {
    return {
      token: 'mock-token',
      url: `pending-provider-room://${params.roomRef}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
