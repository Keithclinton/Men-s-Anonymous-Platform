import { request } from './client';
import type { SessionSummary } from './types';

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
