import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { cn } from '../../lib/cn';
import { AccountMenu } from './AccountMenu';
import { Atmosphere } from './Atmosphere';
import { Chrome } from './Chrome';
import { LangToggle } from './LangToggle';
import { NotificationBell } from './NotificationBell';
import { Sidebar } from './Sidebar';
import { MenuIcon } from '../icons';

export function AppShell({
  children,
  backTo,
  backLabel,
  title,
  eyebrow,
  subtitle,
}: {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
}) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showNav = Boolean(user);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="relative min-h-dvh">
      <Atmosphere />

      {showNav && user ? (
        <aside className="sidebar-panel fixed inset-y-0 left-0 z-30 hidden w-[17.25rem] flex-col px-4 py-5 md:flex">
          <Sidebar user={user} onSignOut={signOut} />
        </aside>
      ) : null}

      {showNav && user && drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="sidebar-panel relative flex h-full w-[min(19rem,88vw)] flex-col px-4 py-5 shadow-[20px_0_80px_rgba(0,0,0,0.45)]">
            <Sidebar
              user={user}
              onSignOut={signOut}
              onNavigate={() => setDrawerOpen(false)}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className={cn(showNav && 'md:pl-[17.25rem]')}>
        <div className={cn(showNav && !backTo && 'md:hidden')}>
          <Chrome
            backTo={backTo}
            backLabel={backLabel}
            markTo={user ? '/home' : '/'}
            hideMarkOnDesktop={showNav}
            leading={
              showNav ? (
                <button
                  type="button"
                  aria-label="Open menu"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-line/80 bg-surface/50 text-cream transition hover:border-mist/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70 md:hidden"
                >
                  <MenuIcon className="size-5" />
                </button>
              ) : null
            }
            trailing={
              user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <LangToggle />
                  <NotificationBell />
                  <AccountMenu user={user} onSignOut={signOut} variant="header" />
                </div>
              ) : null
            }
          />
        </div>

        {title ? (
          <div
            className={cn(
              'relative mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 lg:px-10',
              showNav && !backTo && 'md:pt-10',
            )}
          >
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 font-display text-[1.75rem] tracking-tight text-cream md:text-[2rem]">{title}</h1>
            {subtitle ? (
              <p className="mt-2 max-w-[52ch] text-[14px] leading-6 text-mist md:text-[15px]">{subtitle}</p>
            ) : null}
          </div>
        ) : null}

        <main
          id="main-content"
          className={cn(
            'relative mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-6 lg:px-10',
            'pb-[max(1.75rem,env(safe-area-inset-bottom))] md:pb-14',
            showNav && !backTo && !title && 'md:pt-10',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
