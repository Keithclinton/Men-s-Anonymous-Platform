import { request } from './client';
import type { LoginRequest, SignupRequest, TokenPair } from './types';

export function signup(body: SignupRequest): Promise<TokenPair> {
  return request<TokenPair>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function login(body: LoginRequest): Promise<TokenPair> {
  return request<TokenPair>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
