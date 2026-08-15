import { request } from './client';
import type { SupportGroup, SupportGroupMembership } from './types';

export function listSupportGroups(): Promise<SupportGroup[]> {
  return request<SupportGroup[]>('/support-groups');
}

export function listMySupportGroups(): Promise<SupportGroupMembership[]> {
  return request<SupportGroupMembership[]>('/support-groups/mine');
}

export function joinSupportGroup(id: string): Promise<unknown> {
  return request(`/support-groups/${id}/join`, { method: 'POST' });
}

export function leaveSupportGroup(id: string): Promise<void> {
  return request(`/support-groups/${id}/leave`, { method: 'DELETE' });
}

export function createSupportGroup(body: {
  topic: string;
  schedule: string;
  capacity: number;
}): Promise<unknown> {
  return request('/support-groups', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
