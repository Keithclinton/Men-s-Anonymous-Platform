import { request } from './client';
import type { Booking, SessionChannelType } from './types';

export function requestMatch(body: {
  specialty: string;
  kind?: 'COUNSELOR' | 'MODERATOR';
  scheduledStart: string;
  durationMin: number;
  channelType: SessionChannelType;
}): Promise<Booking> {
  return request<Booking>('/matching/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function acceptMatch(bookingId: string): Promise<Booking> {
  return request<Booking>(`/matching/${bookingId}/accept`, { method: 'POST' });
}

export function declineMatch(bookingId: string): Promise<Booking> {
  return request<Booking>(`/matching/${bookingId}/decline`, { method: 'POST' });
}
