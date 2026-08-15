import { createContext, useContext } from 'react';
import type { MeResponse } from '../api/types';

export interface AuthContextValue {
  user: MeResponse | null;
  ready: boolean;
  signIn: (username: string, password: string, persist: boolean) => Promise<void>;
  signUp: (input: {
    username: string;
    password: string;
    role: 'CLIENT' | 'PROVIDER';
    email?: string;
    phone?: string;
    persist?: boolean;
  }) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
