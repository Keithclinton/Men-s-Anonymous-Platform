import { request } from './client';
import type {
  PayResponse,
  PaymentStatusResponse,
  ProviderEarnings,
  Subscription,
  SubscriptionPlan,
} from './types';

export function payForBooking(bookingId: string, phone: string): Promise<PayResponse> {
  return request<PayResponse>(`/billing/bookings/${bookingId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(`/billing/bookings/${bookingId}/payment-status`);
}

export function getProviderEarnings(): Promise<ProviderEarnings> {
  return request<ProviderEarnings>('/billing/providers/me/earnings');
}

export function requestPayout(body: {
  phone: string;
  amount?: number;
  reason?: string;
}): Promise<PayResponse> {
  return request<PayResponse>('/billing/providers/me/payout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPlans(): Promise<SubscriptionPlan[]> {
  return request<SubscriptionPlan[]>('/billing/plans');
}

export function listMySubscriptions(): Promise<Subscription[]> {
  return request<Subscription[]>('/billing/subscriptions/mine');
}

export function createSubscription(body: {
  plan: 'starter' | 'standard';
  phone: string;
}): Promise<{ subscription: Subscription; payment: PayResponse }> {
  return request('/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
