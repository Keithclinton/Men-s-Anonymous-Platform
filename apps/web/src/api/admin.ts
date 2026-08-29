import { request } from './client';
import type { AdminUser, AuditLogEntry, PendingVerification, StaffRole, UserRole, VerificationDetail } from './types';

export function listUsers(filters?: {
  search?: string;
  role?: UserRole;
  status?: string;
}): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.role) params.set('role', filters.role);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<AdminUser[]>(`/admin/users${query}`);
}

export function assignStaffRole(userId: string, staffRole: StaffRole | null): Promise<unknown> {
  return request(`/admin/users/${userId}/staff-role`, {
    method: 'POST',
    body: JSON.stringify({ staffRole }),
  });
}

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
