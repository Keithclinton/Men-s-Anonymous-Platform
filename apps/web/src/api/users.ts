import { request } from './client';
import type { MeResponse } from './types';

export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/users/me');
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
