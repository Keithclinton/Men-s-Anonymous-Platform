import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MeResponse } from '../../api/types';
import { publicHandle, roleHeadline } from '../../lib/format';

export function AccountMenu({
  user,
  onSignOut,
  variant,
}: {
  user: MeResponse;
  onSignOut: () => void;
  variant: 'header' | 'sidebar';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const handle = user.providerProfile?.displayName || publicHandle(user.username, user.role);
  const role = roleHeadline(user);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'sidebar') {
    return (
      <div className="rounded-2xl border border-line/70 bg-ink/50 p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brass/15 text-[12px] font-medium uppercase tracking-wide text-brass">
            {handle.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-cream">{handle}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-mist">{role}</p>
          </div>
        </div>
        <Link
          to="/account"
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-line text-[13px] text-mist transition hover:border-mist/40 hover:text-cream"
        >
          Account
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-line text-[13px] text-mist transition hover:border-mist/40 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-[11rem] items-center gap-2 rounded-full border border-line/80 bg-surface/60 py-1 pl-1 pr-3 text-left transition hover:border-mist/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brass/15 text-[11px] font-medium uppercase tracking-wide text-brass">
          {handle.slice(0, 2)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-4 text-cream">{handle}</span>
          <span className="block truncate text-[10px] uppercase tracking-[0.12em] text-mist">{role}</span>
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface-2/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <p className="px-3 pt-2 text-[11px] uppercase tracking-[0.14em] text-mist">Signed in</p>
          <p className="break-all px-3 pb-2 pt-1 text-[12px] text-cream">{user.username}</p>
          <Link
            to="/account"
            role="menuitem"
            className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-[13px] text-cream hover:bg-ink/50"
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-[13px] text-mist transition hover:bg-ink/50 hover:text-cream"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
