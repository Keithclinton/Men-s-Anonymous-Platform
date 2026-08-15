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
