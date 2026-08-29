import { NavLink } from 'react-router-dom';
import type { MeResponse } from '../../api/types';
import { navForRole } from '../../lib/nav';
import { cn } from '../../lib/cn';
import { AccountMenu } from './AccountMenu';
import { Wordmark } from '../brand/Wordmark';
import { CloseIcon } from '../icons';

export function Sidebar({
  user,
  onSignOut,
  onNavigate,
  onClose,
}: {
  user: MeResponse;
  onSignOut: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const nav = navForRole(user.role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1 pb-6">
        <Wordmark to="/home" size="sm" />
        {onClose ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line/80 text-cream md:hidden"
          >
            <CloseIcon className="size-5" />
          </button>
        ) : null}
      </div>

      <p className="px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-mist/80">Menu</p>
      <nav aria-label="Primary" className="mt-3 flex flex-1 flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70',
                isActive
                  ? 'bg-surface-2 text-cream shadow-[inset_3px_0_0_0_var(--color-brass)]'
                  : 'text-mist hover:bg-surface/55 hover:text-cream',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl border',
                    isActive ? 'border-brass/40 bg-brass/10 text-brass' : 'border-line/80 text-sage',
                  )}
                >
                  <item.icon className="size-[1.15rem]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{item.label}</span>
                  <span className="block text-[11px] text-mist">{item.hint}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <AccountMenu user={user} onSignOut={onSignOut} variant="sidebar" />
      </div>
    </div>
  );
}
