import { request } from './client';
import type { ClientProfile, MeResponse, UpsertClientProfileRequest } from './types';

export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/users/me');
}

export function updateMyProfile(body: UpsertClientProfileRequest): Promise<ClientProfile> {
  return request<ClientProfile>('/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function updateMe(body: { email?: string; phone?: string }): Promise<MeResponse> {
  return request<MeResponse>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteMe(): Promise<void> {
  return request('/users/me', { method: 'DELETE' });
}
