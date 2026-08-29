import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  CreateJoinTokenParams,
  CreateJoinTokenResult,
  CreateRoomParams,
  CreateRoomResult,
  VideoGateway,
} from './video-gateway.interface';

const ROOM_TTL_SECONDS = 4 * 60 * 60; // rooms auto-expire on Daily's side well after any real session
const TOKEN_TTL_SECONDS = 60 * 60;

/**
 * Daily.co REST API — https://docs.daily.co/reference/rest-api. Chosen over Twilio/Agora
 * for exactly this shape of integration: two plain authenticated REST calls, no persistent
 * SDK connection needed server-side, which is what a Vercel serverless function can
 * actually do. See ARCHITECTURE.md §12.
 */
@Injectable()
export class DailyGateway implements VideoGateway {
  private readonly baseUrl = 'https://api.daily.co/v1';

  constructor(private readonly config: ConfigService) {}

  private get headers() {
    return { Authorization: `Bearer ${this.config.getOrThrow<string>('DAILY_API_KEY')}` };
  }

  async createRoom(params: CreateRoomParams): Promise<CreateRoomResult> {
    // Room names must be unique and URL-safe — bookingId (a UUID) already is.
    const { data } = await axios.post(
      `${this.baseUrl}/rooms`,
      {
        name: `booking-${params.bookingId}`,
        properties: {
          exp: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
          max_participants: 2,
          enable_chat: false, // chat has its own gateway (modules/chat) — don't duplicate it
          enable_recording: false,
        },
      },
      { headers: this.headers },
    );
    return { roomRef: data.name };
  }

  async createJoinToken(params: CreateJoinTokenParams): Promise<CreateJoinTokenResult> {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
    const { data } = await axios.post(
      `${this.baseUrl}/meeting-tokens`,
      {
        properties: {
          room_name: params.roomRef,
          user_id: params.userId,
          user_name: params.userId, // pseudonym only — never a real name, see ARCHITECTURE.md §3
          exp: Math.floor(expiresAt.getTime() / 1000),
        },
      },
      { headers: this.headers },
    );
    return {
      token: data.token,
      url: `https://${this.config.getOrThrow<string>('DAILY_SUBDOMAIN')}.daily.co/${params.roomRef}?t=${data.token}`,
      expiresAt,
    };
  }
}
