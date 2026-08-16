import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { refreshTokens } from '../api/client';
import { getMe } from '../api/users';
import type { MeResponse, SignupRequest, TokenPair } from '../api/types';
import { tokenStore } from './tokens';
import { AuthContext, type AuthContextValue } from './useAuth';

function peekExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimer.current != null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const scheduleRefresh = useCallback((accessToken: string) => {
    clearRefreshTimer();
    const exp = peekExpiry(accessToken);
    if (!exp) return;
    const delay = Math.max(exp * 1000 - Date.now() - 60_000, 15_000);
    refreshTimer.current = window.setTimeout(() => {
      void refreshTokens()
        .then((pair) => scheduleRefresh(pair.accessToken))
        .catch(() => {
          tokenStore.clear();
          setUser(null);
        });
    }, delay);
  }, []);

  const applySession = useCallback(
    async (pair: TokenPair, persist: boolean) => {
      tokenStore.setPair(pair, persist);
      scheduleRefresh(pair.accessToken);
      const me = await getMe();
      setUser(me);
    },
    [scheduleRefresh],
  );

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStore.getRefresh()) {
        setReady(true);
        return;
      }
      try {
        const pair = await refreshTokens();
        if (cancelled) return;
        scheduleRefresh(pair.accessToken);
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void restore();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [scheduleRefresh]);

  const signIn = useCallback(
    async (username: string, password: string, persist: boolean) => {
      const pair = await authApi.login({ username, password });
      await applySession(pair, persist);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: {
      username: string;
      password: string;
      role: 'CLIENT' | 'PROVIDER';
      email?: string;
      phone?: string;
      persist?: boolean;
    }) => {
      const body: SignupRequest = {
        username: input.username.trim(),
        password: input.password,
      };
      if (input.role !== 'CLIENT') body.role = input.role;
      if (input.email) body.email = input.email.trim();
      if (input.phone) body.phone = input.phone;
      const pair = await authApi.signup(body);
      await applySession(pair, input.persist ?? false);
    },
    [applySession],
  );

  const signOut = useCallback(() => {
    clearRefreshTimer();
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await getMe();
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signUp, signOut, refreshMe }),
    [user, ready, signIn, signUp, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
