import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Atmosphere } from './Atmosphere';
import { Chrome } from './Chrome';
import { useAuth } from '../../auth/useAuth';
import { cn } from '../../lib/cn';

type NavItem = { to: string; label: string; end?: boolean };

const clientNav: NavItem[] = [
  { to: '/home', label: 'Home', end: true },
  { to: '/providers', label: 'Find' },
  { to: '/bookings', label: 'Sessions' },
  { to: '/library', label: 'More' },
];

const providerNav: NavItem[] = [
  { to: '/home', label: 'Home', end: true },
  { to: '/provider', label: 'Desk' },
  { to: '/bookings', label: 'Requests' },
];

const adminNav: NavItem[] = [
  { to: '/home', label: 'Home', end: true },
  { to: '/admin', label: 'Admin' },
  { to: '/library', label: 'Content' },
];

export function AppShell({
  children,
  backTo,
  backLabel,
  title,
}: {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  title?: string;
}) {
  const { signOut, user } = useAuth();
  const nav =
    user?.role === 'ADMIN' ? adminNav : user?.role === 'PROVIDER' ? providerNav : clientNav;
  const showNav = Boolean(user);

  return (
    <div className="relative min-h-dvh">
      <Atmosphere />
      <Chrome
        backTo={backTo}
        backLabel={backLabel}
        trailing={
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-10 items-center rounded-full px-3 text-[14px] text-mist transition hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            Sign out
          </button>
        }
      />

      {title ? (
        <div className="relative px-4 pt-4 xl:px-8">
          <h1 className="font-display text-[1.65rem] tracking-tight text-cream">{title}</h1>
        </div>
      ) : null}

      <div
        className={cn(
          'relative mx-auto w-full max-w-lg px-4 pt-4 xl:max-w-3xl xl:px-8',
          showNav
            ? 'pb-[max(5.5rem,env(safe-area-inset-bottom)+4rem)]'
            : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </div>

      {showNav ? (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line/50 bg-ink/90 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <ul
            className={cn(
              'mx-auto grid max-w-lg px-2',
              nav.length === 4 ? 'grid-cols-4' : 'grid-cols-3',
            )}
          >
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-12 items-center justify-center text-[13px] font-medium tracking-wide',
                      isActive ? 'text-brass' : 'text-mist hover:text-cream',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
