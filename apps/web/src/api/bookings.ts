import { request } from './client';
import type { Booking, CreateBookingRequest } from './types';

export function createBooking(body: CreateBookingRequest): Promise<Booking> {
  return request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listMyBookings(): Promise<Booking[]> {
  return request<Booking[]>('/bookings/mine');
}

export function getBooking(id: string): Promise<Booking> {
  return request<Booking>(`/bookings/${id}`);
}

export function cancelBooking(id: string): Promise<Booking> {
  return request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' });
}

export function rescheduleBooking(id: string, slotId: string): Promise<Booking> {
  return request<Booking>(`/bookings/${id}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ slotId }),
  });
}

export function setBookingReminder(id: string, enabled: boolean): Promise<{ ok?: boolean }> {
  return request(`/bookings/${id}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export function reportBooking(
  id: string,
  body: { reason: string; details?: string },
): Promise<{ ok?: boolean }> {
  return request(`/bookings/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
