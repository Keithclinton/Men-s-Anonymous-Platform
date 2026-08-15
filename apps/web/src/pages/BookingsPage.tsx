import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../api/bookings';
import { ApiError } from '../api/errors';
import type { Booking } from '../api/types';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ButtonLink } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { bookingStatusLabel, channelLabel, formatWhen } from '../lib/format';

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listMyBookings()
      .then((rows) => {
        if (!cancelled) setBookings(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load sessions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Your sessions">
      <p className="mb-4 max-w-[40ch] text-[14px] leading-6 text-mist">
        Upcoming and past bookings. Payment and join live here.
      </p>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {loading ? (
        <p className="py-10 text-center text-[14px] text-mist">Loading…</p>
      ) : bookings.length === 0 ? (
        <Panel className="p-5">
          <p className="text-[14px] leading-6 text-mist">No sessions yet.</p>
          <ButtonLink to="/providers" className="mt-4">
            Find support
          </ButtonLink>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link to={`/bookings/${booking.id}`} className="block">
                <Panel className="p-4 transition hover:border-mist/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] text-cream">{formatWhen(booking.scheduledStart)}</p>
                      <p className="mt-1 text-[12px] text-mist">
                        {booking.session ? channelLabel(booking.session.channelType) : 'Session'} ·{' '}
                        {booking.durationMin} min
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-mist">
                      {bookingStatusLabel(booking.status)}
                    </span>
                  </div>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
