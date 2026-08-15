import { request } from './client';
import type { ProviderProfile } from './types';

export function listProviders(specialty?: string): Promise<ProviderProfile[]> {
  const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
  return request<ProviderProfile[]>(`/providers${query}`);
}

export function getProvider(id: string): Promise<ProviderProfile> {
  return request<ProviderProfile>(`/providers/${id}`);
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

export function publishProfile(body: {
  displayName: string;
  bio?: string;
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
