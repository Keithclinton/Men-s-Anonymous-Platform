import { request } from './client';
import type { CreateRevealRequest, RevealGrant } from './types';

export function listMyReveals(): Promise<RevealGrant[]> {
  return request<RevealGrant[]>('/users/me/reveals');
}

export function createReveal(body: CreateRevealRequest): Promise<RevealGrant> {
  return request<RevealGrant>('/users/me/reveals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function revokeReveal(id: string): Promise<RevealGrant> {
  return request<RevealGrant>(`/users/me/reveals/${id}/revoke`, { method: 'POST' });
}

export function listProviderReveals(): Promise<RevealGrant[]> {
  return request<RevealGrant[]>('/providers/me/reveals');
}
