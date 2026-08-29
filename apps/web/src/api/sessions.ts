import { request } from './client';
import { ApiError } from './errors';
import type { SessionJoin, SessionMessage, SessionSummary } from './types';

export function startSession(bookingId: string): Promise<SessionSummary> {
  return request<SessionSummary>(`/bookings/${bookingId}/session/start`, {
    method: 'POST',
  });
}

export function endSession(bookingId: string): Promise<SessionSummary> {
  return request<SessionSummary>(`/bookings/${bookingId}/session/end`, {
    method: 'POST',
  });
}

export function getSessionJoin(bookingId: string): Promise<SessionJoin> {
  return request<SessionJoin>(`/bookings/${bookingId}/session/join`);
}

export function listSessionMessages(
  bookingId: string,
  after?: string,
): Promise<SessionMessage[]> {
  const query = after ? `?after=${encodeURIComponent(after)}` : '';
  return request<SessionMessage[]>(`/bookings/${bookingId}/session/messages${query}`);
}

export function sendSessionMessage(bookingId: string, body: string): Promise<SessionMessage> {
  return request<SessionMessage>(`/bookings/${bookingId}/session/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function isRelayUnimplemented(err: unknown): boolean {
  return err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 501);
}
