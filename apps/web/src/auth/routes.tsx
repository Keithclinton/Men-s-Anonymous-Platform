import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <BootScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  if (!ready) return <BootScreen />;
  if (user) return <Navigate to="/home" replace />;
  return children;
}

export function BootScreen() {
  return (
    <div className="atmosphere relative flex min-h-dvh items-center justify-center">
      <p className="text-[14px] tracking-wide text-mist">Loading…</p>
    </div>
  );
}
