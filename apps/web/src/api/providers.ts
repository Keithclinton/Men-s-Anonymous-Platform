import { request } from './client';
import type { AvailabilitySlot, MyVerificationStatus, ProviderKind, ProviderProfile } from './types';

export function listProviders(filters?: {
  specialty?: string;
  kind?: ProviderKind;
}): Promise<ProviderProfile[]> {
  const params = new URLSearchParams();
  if (filters?.specialty) params.set('specialty', filters.specialty);
  if (filters?.kind) params.set('kind', filters.kind);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<ProviderProfile[]>(`/providers${query}`);
}

export function getProvider(id: string): Promise<ProviderProfile> {
  return request<ProviderProfile>(`/providers/${id}`);
}

export function listProviderSlots(providerId: string): Promise<AvailabilitySlot[]> {
  return request<AvailabilitySlot[]>(`/providers/${providerId}/slots`);
}

export function listMySlots(): Promise<AvailabilitySlot[]> {
  return request<AvailabilitySlot[]>('/providers/me/slots');
}

export function createSlot(body: {
  start: string;
  durationMin: number;
}): Promise<AvailabilitySlot> {
  return request<AvailabilitySlot>('/providers/me/slots', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteSlot(slotId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/providers/me/slots/${slotId}`, { method: 'DELETE' });
}

export function submitVerification(body: {
  licenseNumber: string;
  verifyingBody?: string;
  expiryDate?: string;
  documentRefs?: Record<string, unknown>;
}): Promise<{ id: string }> {
  return request<{ id: string }>('/providers/me/verification', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getMyVerificationStatus(): Promise<MyVerificationStatus> {
  return request<MyVerificationStatus>('/providers/me/verification');
}

export function publishProfile(body: {
  displayName: string;
  bio?: string;
  kind: ProviderKind;
  specialties: string[];
  rateCard?: { minimumRate: number; hourlyRate: number };
  availability?: Record<string, unknown>;
}): Promise<ProviderProfile> {
  return request<ProviderProfile>('/providers/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function updateAvailability(availability: Record<string, unknown>): Promise<ProviderProfile> {
  return request<ProviderProfile>('/providers/me/availability', {
    method: 'PATCH',
    body: JSON.stringify({ availability }),
  });
}
