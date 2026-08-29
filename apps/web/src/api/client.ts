import { ApiError, networkError, parseApiError } from './errors';
import { tokenStore } from '../auth/tokens';
import type { TokenPair } from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const AUTH_PATHS = new Set(['/auth/login', '/auth/signup', '/auth/refresh']);

let refreshInFlight: Promise<TokenPair> | null = null;

async function refreshTokens(): Promise<TokenPair> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) {
    throw new ApiError(401, ['Session expired. Sign in again.']);
  }

  if (!refreshInFlight) {
    refreshInFlight = request<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      _skipRefresh: true,
    }).then((pair) => {
      tokenStore.setPair(pair, tokenStore.isPersistent());
      return pair;
    }).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

type RequestOptions = RequestInit & { _skipRefresh?: boolean };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { _skipRefresh, headers, ...init } = options;
  const access = tokenStore.getAccess();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw networkError();
  }

  if (response.status === 401 && !_skipRefresh && !AUTH_PATHS.has(path) && tokenStore.getRefresh()) {
    await refreshTokens();
    return request<T>(path, { ...options, _skipRefresh: true });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseApiError(response.status, body);
  }

  return body as T;
}

export { refreshTokens, API_URL };
