import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../../api/bookings';
import type { Booking } from '../../api/types';
import { useAuth } from '../../auth/useAuth';
import { formatWhen } from '../../lib/format';
import { sessionIsLive } from '../../lib/session';
import { useLocale } from '../../lib/i18n';
import { BellIcon } from '../icons';

export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    void listMyBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [user]);

  const items = useMemo(() => {
    const soon = Date.now() + 24 * 60 * 60 * 1000;
    return bookings
      .filter((row) => {
        if (sessionIsLive(row)) return true;
        if (row.status === 'REQUESTED') return true;
        if (row.status === 'CONFIRMED' && new Date(row.scheduledStart).getTime() < soon) return true;
        return false;
      })
      .slice(0, 6);
  }, [bookings]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open]);

  if (!user || user.role === 'ADMIN') return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t.notifications}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-line/80 bg-surface/50 text-cream"
      >
        <span className="sr-only">{t.notifications}</span>
        <BellIcon className="size-5" />
        {items.length ? (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-brass" />
        ) : null}
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-2/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        >
          <p className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-mist">{t.notifications}</p>
          {items.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-mist">Nothing waiting.</p>
          ) : (
            items.map((row) => (
              <Link
                key={row.id}
                to={sessionIsLive(row) ? `/bookings/${row.id}/room` : `/bookings/${row.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-[13px] text-cream hover:bg-ink/50"
              >
                {sessionIsLive(row) ? 'Live now' : row.status === 'REQUESTED' ? 'Waiting on provider' : 'Upcoming'}
                <span className="mt-0.5 block text-[11px] text-mist">{formatWhen(row.scheduledStart)}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
