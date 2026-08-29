import { isEmailIdentifier } from '../lib/validation';
import { request } from './client';
import type { LoginRequest, SignupRequest, TokenPair } from './types';

export function signup(body: SignupRequest): Promise<TokenPair> {
  return request<TokenPair>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function forgotPassword(identifier: string): Promise<{ ok?: boolean }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(
      isEmailIdentifier(identifier.trim())
        ? { email: identifier.trim() }
        : { username: identifier.trim() },
    ),
  });
}

export function resetPassword(token: string, password: string): Promise<{ ok?: boolean }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function changePassword(currentPassword: string, nextPassword: string): Promise<{ ok?: boolean }> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, nextPassword }),
  });
}

export function login(identifier: string, password: string): Promise<TokenPair> {
  const trimmed = identifier.trim();
  const body: LoginRequest = isEmailIdentifier(trimmed)
    ? { email: trimmed, password }
    : { username: trimmed, password };
  return request<TokenPair>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
