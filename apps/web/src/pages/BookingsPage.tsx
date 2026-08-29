import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../api/bookings';
import { ApiError } from '../api/errors';
import type { Booking } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ButtonLink } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { StatusBadge } from '../components/ui/Chip';
import { bookingStatusLabel, bookingStatusTone, channelLabel, formatWhen } from '../lib/format';

export function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isProvider = user?.role === 'PROVIDER';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      setLoading(false);
      return;
    }
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
  }, [isAdmin]);

  return (
    <AppShell
      title={isProvider ? 'Requests & sessions' : 'Your sessions'}
      eyebrow={isProvider ? 'Inbox' : 'Bookings'}
      subtitle={
        isProvider
          ? 'Auto-match requests and confirmed bookings. Accept from your desk, then run the session here.'
          : 'Upcoming and past bookings. Payment and join live on each thread.'
      }
    >
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {isAdmin ? (
        <Panel className="max-w-lg p-6">
          <p className="text-[14px] leading-6 text-mist">
            Admins don’t hold sessions. Use the console for verification, people, and audit.
          </p>
          <div className="mt-4 max-w-[12rem]">
            <ButtonLink to="/admin" variant="secondary">
              Open console
            </ButtonLink>
          </div>
        </Panel>
      ) : loading ? (
        <p className="py-10 text-center text-[14px] text-mist">Loading…</p>
      ) : bookings.length === 0 ? (
        <Panel className="max-w-lg p-6">
          <p className="text-[14px] leading-6 text-mist">
            {isProvider
              ? 'No requests yet. Publish a profile and calendar so clients can find you.'
              : 'No sessions yet.'}
          </p>
          <div className="mt-4 max-w-[12rem]">
            <ButtonLink to={isProvider ? '/provider' : '/providers'}>
              {isProvider ? 'Open desk' : 'Find support'}
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link to={`/bookings/${booking.id}`} className="block h-full">
                <Panel className="flex h-full items-start justify-between gap-3 p-5 transition hover:border-brass/35">
                  <div className="min-w-0">
                    <p className="font-display text-[1.2rem] tracking-tight text-cream">
                      {formatWhen(booking.scheduledStart)}
                    </p>
                    <p className="mt-1 text-[13px] text-mist">
                      {booking.session ? channelLabel(booking.session.channelType) : 'Session'} ·{' '}
                      {booking.durationMin} min
                    </p>
                  </div>
                  <StatusBadge tone={bookingStatusTone(booking.status)}>
                    {bookingStatusLabel(booking.status)}
                  </StatusBadge>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
