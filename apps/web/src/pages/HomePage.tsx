import { useEffect, useState } from 'react';
import { listAuditLog, listPendingVerifications } from '../api/admin';
import { listMyBookings } from '../api/bookings';
import type { AuditLogEntry, Booking, PendingVerification } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { BadgeIcon, BookIcon, CompassIcon, ShieldIcon, SparkIcon, WalletIcon } from '../components/icons';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ActionCard } from '../components/ui/ActionCard';
import { ButtonLink } from '../components/ui/Button';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { FirstRunTour } from '../components/ui/FirstRunTour';
import { publicHandle, roleHeadline, staffRoleLabel, formatWhen } from '../lib/format';
import { bookingChannel, sessionIsLive } from '../lib/session';
import { getIntake } from '../lib/intake';
import { getMyVerification } from '../api/providers';

export function HomePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [queue, setQueue] = useState<PendingVerification[] | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[] | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'CLIENT' || user.role === 'PROVIDER') {
      void listMyBookings()
        .then(setBookings)
        .catch(() => setBookings([]));
    }
    if (user.role === 'PROVIDER') {
      void getMyVerification()
        .then((row) => setVerifyStatus(row.status))
        .catch(() => setVerifyStatus(null));
    }
    if (user.role === 'ADMIN') {
      void Promise.all([
        listPendingVerifications().catch(() => [] as PendingVerification[]),
        listAuditLog(6).catch(() => [] as AuditLogEntry[]),
      ]).then(([pending, log]) => {
        setQueue(pending);
        setAudit(log);
      });
    }
  }, [user]);

  if (!user) return null;

  const isProvider = user.role === 'PROVIDER';
  const handle =
    user.providerProfile?.displayName ||
    (isProvider && user.email ? user.email : publicHandle(user.username, user.role));
  const role = roleHeadline(user);
  const openSessions = (bookings ?? []).filter(
    (row) => row.status === 'REQUESTED' || row.status === 'CONFIRMED',
  ).length;

  const next = (bookings ?? [])
    .filter((row) => row.status === 'CONFIRMED' || sessionIsLive(row))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0];
  const lastDone = (bookings ?? [])
    .filter((row) => row.status === 'COMPLETED')
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart))[0];
  const needsRate = (bookings ?? []).find(
    (row) => row.status === 'COMPLETED' && row.session && !row.session.feedback,
  );
  const intake = user.role === 'CLIENT' ? getIntake(user.id) : null;

  return (
    <AppShell>
      <FirstRunTour role={user.role} />
      <div className="mb-4">
        <CrisisBanner />
      </div>
      {verifyStatus && verifyStatus !== 'APPROVED' ? (
        <Panel className="mb-4 p-4">
          <p className="text-[13px] text-cream">Verification: {verifyStatus.replaceAll('_', ' ')}</p>
          <p className="mt-1 text-[12px] text-mist">Publish stays blocked until compliance approves you.</p>
        </Panel>
      ) : null}
      <Panel className="p-5 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">You’re in</p>
            <h1 className="mt-2 break-all font-display text-[clamp(1.85rem,4vw,2.6rem)] leading-tight tracking-tight text-cream">
              {handle}
            </h1>
            {handle !== user.username ? (
              <p className="mt-1 break-all text-[12px] text-mist">{user.username}</p>
            ) : null}
            <p className="mt-4 max-w-[46ch] text-[14px] leading-6 text-mist md:text-[15px]">
              {user.role === 'ADMIN'
                ? 'Operations stay on this side of the vault. Verification, people, and content live in the console.'
                : isProvider
                  ? 'Clients and admins can verify you by this email — providers aren’t anonymous.'
                  : 'This handle is what others see. Reveal is optional and scoped — never a public dump.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-ink/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-mist">
              {role}
            </span>
            {user.role !== 'ADMIN' ? (
              <span className="rounded-full bg-brass/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-brass">
                {openSessions
                  ? `${openSessions} open session${openSessions === 1 ? '' : 's'}`
                  : 'No open sessions'}
              </span>
            ) : null}
          </div>
        </div>
      </Panel>

      {next ? (
        <Panel className="mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Next session</p>
            <p className="mt-1 font-display text-xl text-cream">{formatWhen(next.scheduledStart)}</p>
            <p className="text-[13px] text-mist">{bookingChannel(next) === 'CHAT' ? '1:1 chat' : 'Video'}</p>
          </div>
          <div className="w-full sm:w-40">
            <ButtonLink to={sessionIsLive(next) ? `/bookings/${next.id}/room` : `/bookings/${next.id}`}>
              {sessionIsLive(next) ? 'Join' : 'Open'}
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      {user.role === 'CLIENT' && lastDone ? (
        <Panel className="mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-sage">Continue</p>
            <p className="mt-1 text-[14px] text-cream">Book the same provider again</p>
          </div>
          <div className="w-full sm:w-40">
            <ButtonLink to={`/providers/${lastDone.providerId}/book`} variant="secondary">
              Book again
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      {needsRate ? (
        <Panel className="mt-3 p-5">
          <p className="text-[14px] text-cream">A session is waiting on your rating.</p>
          <div className="mt-3 max-w-[12rem]">
            <ButtonLink to={`/bookings/${needsRate.id}`} variant="secondary">
              Rate session
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      {intake && user.role === 'CLIENT' ? (
        <p className="mt-3 text-[12px] text-mist">
          Intake: {intake.focus} · {intake.who.toLowerCase()} · {intake.channel === 'CHAT' ? 'chat' : 'video'}
        </p>
      ) : null}

      {user.role === 'CLIENT' ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            to="/providers"
            icon={<CompassIcon className="size-5" />}
            kicker="Direct book"
            title="Find a provider"
            body="Browse counselors and moderators, then pick an open slot."
          />
          <ActionCard
            to="/match"
            icon={<SparkIcon className="size-5" />}
            kicker="Queue"
            title="Auto-match me"
            body="Tell us specialty and time. We assign the least-loaded match."
          />
          <ActionCard
            to="/bookings"
            icon={<BookIcon className="size-5" />}
            kicker="Your work"
            title={openSessions ? `${openSessions} open session${openSessions === 1 ? '' : 's'}` : 'Your sessions'}
            body="Pay, join, reveal, and leave feedback from one thread."
          />
          <ActionCard
            to="/library"
            kicker="Community"
            title="Groups & library"
            body="Join a support group or read something published for members."
          />
          <ActionCard
            to="/profile"
            icon={<BadgeIcon className="size-5" />}
            kicker="Preferences"
            title="Your profile"
            body="Support preferences and intake notes, visible only to you and matched providers."
          />
          <ActionCard
            to="/plans"
            icon={<WalletIcon className="size-5" />}
            kicker="Billing"
            title="Session plans"
            body="See subscription plans and manage recurring sessions."
          />
        </div>
      ) : null}

      {user.role === 'PROVIDER' ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionCard
            to="/provider"
            icon={<ShieldIcon className="size-5" />}
            kicker="Practice"
            title="Open your desk"
            body="Requests, calendar, rates, verification, and earnings in one place."
          />
          <ActionCard
            to="/bookings"
            kicker="Inbox"
            title={openSessions ? `${openSessions} live request${openSessions === 1 ? '' : 's'}` : 'Requests & sessions'}
            body="Accept auto-matches, then run confirmed bookings from here."
          />
        </div>
      ) : null}

      {user.role === 'ADMIN' ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionCard
            to="/admin"
            icon={<ShieldIcon className="size-5" />}
            kicker={staffRoleLabel(user.staffRole)}
            title="Open console"
            body={
              queue
                ? queue.length
                  ? `${queue.length} verification${queue.length === 1 ? '' : 's'} waiting.`
                  : 'No verification queue. People, content, and audit are inside.'
                : 'Verification, people, content, and the audit trail.'
            }
          />
          <ActionCard
            to="/library"
            icon={<BookIcon className="size-5" />}
            kicker="Public"
            title="See the library"
            body="Check what members actually see after you publish groups or resources."
          />
        </div>
      ) : null}

      {user.role === 'ADMIN' && audit && audit.length > 0 ? (
        <Panel className="mt-5 p-5 lg:max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Recent audit</p>
          <ul className="mt-3 divide-y divide-line/70">
            {audit.slice(0, 4).map((entry) => (
              <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[13px] text-cream">{entry.action.replaceAll('_', ' ')}</p>
                <p className="mt-0.5 font-mono text-[11px] text-mist">
                  {entry.actorPseudonym.slice(0, 8)}… → {entry.target.slice(0, 8)}…
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </AppShell>
  );
}
