import { request } from './client';
import type { PayResponse, PaymentStatusResponse } from './types';

export function payForBooking(bookingId: string, phone: string): Promise<PayResponse> {
  return request<PayResponse>(`/billing/bookings/${bookingId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(`/billing/bookings/${bookingId}/payment-status`);
}
