import { request } from './client';
import type { AuditLogEntry, PendingVerification, VerificationDetail } from './types';

export function listPendingVerifications(): Promise<PendingVerification[]> {
  return request<PendingVerification[]>('/admin/verifications');
}

export function getVerificationDetail(id: string): Promise<VerificationDetail> {
  return request<VerificationDetail>(`/admin/verifications/${id}`);
}

export function decideVerification(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<{ pseudonymId: string }> {
  return request(`/admin/verifications/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}

export function suspendUser(userId: string): Promise<unknown> {
  return request(`/admin/users/${userId}/suspend`, { method: 'POST' });
}

export function reinstateUser(userId: string): Promise<unknown> {
  return request(`/admin/users/${userId}/reinstate`, { method: 'POST' });
}

export function listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>(`/admin/audit-log?limit=${limit}`);
}

export function searchUsers(q: string): Promise<Array<{ id: string; username: string; role: string }>> {
  return request(`/admin/users?q=${encodeURIComponent(q)}`);
}

export function breakGlass(
  pseudonymId: string,
  reason: string,
): Promise<{
  pseudonymId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}> {
  return request(`/admin/vault/${pseudonymId}/break-glass`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
