import type { TokenPair } from '../api/types';

const REFRESH_KEY = 'map.refreshToken';
const PERSIST_KEY = 'map.persistSession';

/**
 * Access tokens live in memory only (15 min TTL). Refresh tokens are persisted
 * in sessionStorage by default so closing the tab signs you out — better on a
 * shared phone. "Stay signed in" opts into localStorage instead.
 */
class TokenStore {
  private accessToken: string | null = null;

  getAccess(): string | null {
    return this.accessToken;
  }

  getRefresh(): string | null {
    return sessionStorage.getItem(REFRESH_KEY) ?? localStorage.getItem(REFRESH_KEY);
  }

  isPersistent(): boolean {
    return localStorage.getItem(PERSIST_KEY) === '1';
  }

  setPair(pair: TokenPair, persist: boolean): void {
    this.accessToken = pair.accessToken;
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PERSIST_KEY);

    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(REFRESH_KEY, pair.refreshToken);
    if (persist) localStorage.setItem(PERSIST_KEY, '1');
  }

  setPersist(persist: boolean): void {
    const refresh = this.getRefresh();
    const access = this.accessToken;
    if (!refresh || !access) return;
    this.setPair({ accessToken: access, refreshToken: refresh }, persist);
  }

  clear(): void {
    this.accessToken = null;
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PERSIST_KEY);
  }
}

export const tokenStore = new TokenStore();
