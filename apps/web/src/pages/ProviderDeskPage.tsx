import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { getProviderEarnings, requestPayout } from '../api/billing';
import { listMyBookings } from '../api/bookings';
import { listProviderFeedback } from '../api/feedback';
import { acceptMatch, declineMatch } from '../api/matching';
import {
  createSlot,
  deleteSlot,
  listMySlots,
  publishProfile,
  submitVerification,
  updateAvailability,
  getMyVerification,
} from '../api/providers';
import { listProviderReveals } from '../api/reveals';
import type {
  AvailabilitySlot,
  Booking,
  Feedback,
  ProviderEarnings,
  ProviderKind,
  ProviderProfile,
  RevealGrant,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { CalendarIcon, ChatIcon, EyeIcon, PulseIcon, ShieldIcon, StarIcon, WalletIcon } from '../components/icons';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ToolTile } from '../components/ui/ActionCard';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup, TextArea } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import { SlotCalendar } from '../components/ui/SlotCalendar';
import {
  bookingStatusLabel,
  channelLabel,
  defaultScheduleInput,
  formatKes,
  formatWhen,
  localInputToIso,
  revealLevelLabel,
} from '../lib/format';

type DeskTab = 'requests' | 'calendar' | 'earnings' | 'profile' | 'verify' | 'reveals' | 'feedback';

export function ProviderDeskPage() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DeskTab>('requests');
  const [requests, setRequests] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reveals, setReveals] = useState<RevealGrant[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [earnings, setEarnings] = useState<ProviderEarnings | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const profile = user?.providerProfile ?? null;

  function selectTab(next: DeskTab) {
    setTab(next);
    setError(null);
  }

  async function refresh() {
    const [bookings, fb, rev, openSlots, earn, verify] = await Promise.all([
      listMyBookings(),
      listProviderFeedback().catch(() => [] as Feedback[]),
      listProviderReveals().catch(() => [] as RevealGrant[]),
      listMySlots().catch(() => [] as AvailabilitySlot[]),
      getProviderEarnings().catch(() => null),
      getMyVerification().catch(() => null),
    ]);
    setRequests(bookings.filter((b) => b.status === 'REQUESTED' && b.providerId === user?.id));
    setFeedback(fb);
    setReveals(rev);
    setSlots(openSlots);
    setEarnings(earn);
    setVerifyStatus(verify?.status ?? null);
  }

  useEffect(() => {
    if (user?.role !== 'PROVIDER') return;
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load desk.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  if (user && user.role !== 'PROVIDER') {
    return (
      <AppShell title="Provider desk">
        <Notice>Provider accounts only.</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Desk"
      eyebrow="Practice"
      subtitle="Requests, calendar, rates, verification, and earnings in one place."
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        <ToolTile
          active={tab === 'requests'}
          label="Requests"
          hint="Auto-match"
          icon={<ChatIcon className="size-5" />}
          badge={requests.length || undefined}
          onClick={() => selectTab('requests')}
        />
        <ToolTile
          active={tab === 'calendar'}
          label="Calendar"
          hint="Open slots"
          icon={<CalendarIcon className="size-5" />}
          onClick={() => selectTab('calendar')}
        />
        <ToolTile
          active={tab === 'earnings'}
          label="Earnings"
          hint="Payouts"
          icon={<WalletIcon className="size-5" />}
          onClick={() => selectTab('earnings')}
        />
        <ToolTile
          active={tab === 'profile'}
          label="Profile"
          hint="Public card"
          icon={<ShieldIcon className="size-5" />}
          onClick={() => selectTab('profile')}
        />
        <ToolTile
          active={tab === 'verify'}
          label="Verify"
          hint="License"
          icon={<PulseIcon className="size-5" />}
          onClick={() => selectTab('verify')}
        />
        <ToolTile
          active={tab === 'reveals'}
          label="Reveals"
          hint="Client grants"
          icon={<EyeIcon className="size-5" />}
          onClick={() => selectTab('reveals')}
        />
        <ToolTile
          active={tab === 'feedback'}
          label="Feedback"
          hint="Ratings"
          icon={<StarIcon className="size-5" />}
          onClick={() => selectTab('feedback')}
        />
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
      ) : null}
      {verifyStatus && verifyStatus !== 'APPROVED' ? (
        <Panel className="mb-3 p-4">
          <p className="text-[13px] text-cream">Verification: {verifyStatus.replaceAll('_', ' ')}</p>
          <p className="mt-1 text-[12px] text-mist">License under review — you can’t publish until compliance approves you.</p>
        </Panel>
      ) : null}
      {loading ? <p className="py-6 text-center text-[14px] text-mist">Loading…</p> : null}

      {tab === 'requests' && !loading ? (
        <div className="flex flex-col gap-3">
          {requests.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No pending auto-match requests.</p>
            </Panel>
          ) : (
            requests.map((booking) => (
              <Panel key={booking.id} className="p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-sage">
                  {bookingStatusLabel(booking.status)}
                </p>
                <p className="mt-1 text-[15px] text-cream">
                  {formatWhen(booking.scheduledStart)} · {booking.durationMin}m ·{' '}
                  {booking.session ? channelLabel(booking.session.channelType) : '—'}
                </p>
                <p className="mt-1 text-[13px] text-mist">Specialty: {booking.specialty ?? '—'}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    loading={acting}
                    onClick={async () => {
                      setActing(true);
                      try {
                        await acceptMatch(booking.id);
                        setNotice('Request accepted.');
                        await refresh();
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : 'Accept failed.');
                      } finally {
                        setActing(false);
                      }
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    loading={acting}
                    onClick={async () => {
                      setActing(true);
                      try {
                        await declineMatch(booking.id);
                        setNotice('Declined — may reassign.');
                        await refresh();
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : 'Decline failed.');
                      } finally {
                        setActing(false);
                      }
                    }}
                  >
                    Decline
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(`/bookings/${booking.id}`)}>
                    Open
                  </Button>
                </div>
              </Panel>
            ))
          )}
        </div>
      ) : null}

      {tab === 'calendar' && !loading ? (
        <SlotsPanel
          slots={slots}
          onChanged={async () => {
            setNotice('Calendar updated.');
            await refresh();
          }}
          onError={setError}
        />
      ) : null}

      {tab === 'earnings' && !loading ? (
        <EarningsPanel
          earnings={earnings}
          onDone={async (msg) => {
            setNotice(msg);
            await refresh();
          }}
          onError={setError}
        />
      ) : null}

      {tab === 'profile' && !loading ? (
        <ProfileForm
          existing={profile}
          onSaved={async () => {
            setNotice('Profile published.');
            setError(null);
            await refreshMe();
            await refresh();
          }}
          onError={setError}
        />
      ) : null}

      {tab === 'verify' && !loading ? (
        <VerifyForm
          onDone={(id) => setNotice(`Verification submitted (${id}). Wait for admin approval.`)}
          onError={setError}
        />
      ) : null}

      {tab === 'reveals' && !loading ? (
        <div className="flex flex-col gap-3">
          {reveals.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No active identity reveals aimed at you.</p>
            </Panel>
          ) : (
            reveals.map((grant) => (
              <Panel key={grant.id} className="p-4">
                <p className="text-[13px] text-cream">{revealLevelLabel(grant.level)}</p>
                <p className="mt-1 text-[12px] text-mist">
                  {[grant.firstName, grant.fullName].filter(Boolean).join(' · ') || 'Details on grant'}
                </p>
              </Panel>
            ))
          )}
        </div>
      ) : null}

      {tab === 'feedback' && !loading ? (
        <div className="flex flex-col gap-3">
          {feedback.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No feedback yet.</p>
            </Panel>
          ) : (
            feedback.map((item) => (
              <Panel key={item.id} className="p-4">
                <p className="text-[15px] text-cream">{'★'.repeat(item.rating)}</p>
                {item.comment ? <p className="mt-1 text-[13px] text-mist">{item.comment}</p> : null}
              </Panel>
            ))
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

function SlotsPanel({
  slots,
  onChanged,
  onError,
}: {
  slots: AvailabilitySlot[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [start, setStart] = useState(defaultScheduleInput);
  const [durationMin, setDurationMin] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createSlot({ start: localInputToIso(start), durationMin });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Couldn’t create slot.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <p className="text-[13px] leading-5 text-mist">
          Publish open slots clients can book directly. Free-form notes stay on the profile tab.
        </p>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3">
          <FieldGroup>
            <Field
              label="Start"
              type="datetime-local"
              name="start"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
            <Field
              label="Duration (min)"
              type="number"
              name="durationMin"
              value={String(durationMin)}
              onChange={(e) => setDurationMin(Number(e.target.value) || 30)}
              required
            />
          </FieldGroup>
          <Button type="submit" loading={submitting}>
            Add slot
          </Button>
        </form>
      </Panel>
      {slots.length > 0 ? (
        <Panel className="p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-brass">This week</p>
          <SlotCalendar slots={slots} />
        </Panel>
      ) : null}
      {slots.length === 0 ? (
        <Panel className="p-5">
          <p className="text-[14px] text-mist">No slots yet.</p>
        </Panel>
      ) : (
        slots.map((slot) => (
          <Panel key={slot.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[14px] text-cream">{formatWhen(slot.start)}</p>
              <p className="text-[12px] text-mist">
                {slot.durationMin} min
                {slot.bookingId ? ' · booked' : ' · open'}
              </p>
            </div>
            {!slot.bookingId ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await deleteSlot(slot.id);
                    await onChanged();
                  } catch (err) {
                    onError(err instanceof ApiError ? err.message : 'Delete failed.');
                  }
                }}
              >
                Remove
              </Button>
            ) : null}
          </Panel>
        ))
      )}
    </div>
  );
}

function kes(value: number | string) {
  return formatKes(typeof value === 'number' ? value : Number(value));
}

function EarningsPanel({
  earnings,
  onDone,
  onError,
}: {
  earnings: ProviderEarnings | null;
  onDone: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  async function onPayout(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPayout({ phone: phone.trim() });
      await onDone('Payout requested — check M-Pesa once Daraja B2C is approved.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Payout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!earnings) {
    return (
      <Panel className="p-5">
        <p className="text-[14px] text-mist">Couldn’t load earnings.</p>
      </Panel>
    );
  }

  const charges = earnings.recentCharges.filter((row) => row.createdAt.slice(0, 7) === month);
  const payouts = earnings.recentPayouts.filter((row) => row.createdAt.slice(0, 7) === month);

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Available</p>
        <p className="mt-2 font-display text-3xl text-cream">{formatKes(earnings.available)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-mist">Gross paid</dt>
            <dd className="mt-1 text-cream">{formatKes(earnings.grossSucceeded)}</dd>
          </div>
          <div>
            <dt className="text-mist">Paid out</dt>
            <dd className="mt-1 text-cream">{formatKes(earnings.paidOut)}</dd>
          </div>
        </dl>
      </Panel>
      <Panel className="p-5">
        <label className="text-[11px] uppercase tracking-[0.14em] text-brass" htmlFor="earn-month">
          Month
        </label>
        <input
          id="earn-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-ink/50 px-3 text-[16px] text-cream"
        />
        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-sage">Charges</p>
        {charges.length === 0 ? (
          <p className="mt-2 text-[13px] text-mist">No charges this month.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line/70">
            {charges.map((row) => (
              <li key={row.externalRef} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-cream">{kes(row.amount)}</p>
                  <p className="truncate text-[11px] text-mist">{formatWhen(row.createdAt)}</p>
                </div>
                <p className="shrink-0 font-mono text-[10px] text-mist">{row.externalRef.slice(0, 8)}…</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-sage">Payouts</p>
        {payouts.length === 0 ? (
          <p className="mt-2 text-[13px] text-mist">No payouts this month.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line/70">
            {payouts.map((row) => (
              <li key={row.externalRef} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-cream">{kes(row.amount)}</p>
                  <p className="truncate text-[11px] text-mist">
                    {row.status} · {formatWhen(row.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="p-5">
        <p className="text-[13px] leading-5 text-mist">
          M-Pesa B2C payout. Needs Daraja B2C credentials on the API.
        </p>
        <form onSubmit={onPayout} className="mt-4 flex flex-col gap-3">
          <Field
            label="M-Pesa phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2547…"
            required
          />
          <Button type="submit" loading={submitting} disabled={earnings.available <= 0}>
            Request full payout
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function VerifyForm({
  onDone,
  onError,
}: {
  onDone: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [verifyingBody, setVerifyingBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitVerification({
        licenseNumber: licenseNumber.trim(),
        verifyingBody: verifyingBody.trim() || undefined,
      });
      onDone(result.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Verification submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel className="p-5">
      <p className="text-[13px] leading-5 text-mist">
        Submit credentials for admin review. You can’t publish a public profile until approved.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <FieldGroup>
          <Field
            label="License number"
            name="licenseNumber"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
          />
          <Field
            label="Verifying body"
            name="verifyingBody"
            value={verifyingBody}
            onChange={(e) => setVerifyingBody(e.target.value)}
            placeholder="Optional"
          />
        </FieldGroup>
        <Button type="submit" loading={submitting}>
          Submit for review
        </Button>
      </form>
    </Panel>
  );
}

function ProfileForm({
  existing,
  onSaved,
  onError,
}: {
  existing: ProviderProfile | null;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [kind, setKind] = useState<ProviderKind>(existing?.kind ?? 'COUNSELOR');
  const [specialties, setSpecialties] = useState((existing?.specialties ?? []).join(', '));
  const [minimumRate, setMinimumRate] = useState(String(existing?.rateCard?.minimumRate ?? 500));
  const [hourlyRate, setHourlyRate] = useState(String(existing?.rateCard?.hourlyRate ?? 1500));
  const [availabilityNote, setAvailabilityNote] = useState(
    typeof existing?.availability?.note === 'string' ? existing.availability.note : '',
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await publishProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        kind,
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        rateCard: {
          minimumRate: Number(minimumRate),
          hourlyRate: Number(hourlyRate),
        },
        availability: availabilityNote.trim()
          ? { note: availabilityNote.trim() }
          : existing?.availability ?? undefined,
      });
      if (availabilityNote.trim()) {
        await updateAvailability({ note: availabilityNote.trim() }).catch(() => undefined);
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Couldn’t save profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel className="p-5">
      <p className="text-[13px] leading-5 text-mist">
        Public pseudonymous profile. Clients never see your legal identity.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <Segmented
          legend="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'COUNSELOR', label: 'Counselor', hint: 'Licensed path' },
            { value: 'MODERATOR', label: 'Moderator', hint: 'Peer support' },
          ]}
        />
        <FieldGroup>
          <Field
            label="Display name"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <TextArea label="Bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Field
            label="Specialties"
            name="specialties"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="career, relationships"
            hint="Comma-separated"
            required
          />
          <Field
            label="Minimum rate (≤30 min)"
            name="minimumRate"
            type="number"
            inputMode="decimal"
            value={minimumRate}
            onChange={(e) => setMinimumRate(e.target.value)}
            required
          />
          <Field
            label="Hourly rate"
            name="hourlyRate"
            type="number"
            inputMode="decimal"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            required
          />
          <TextArea
            label="Availability note"
            name="availability"
            value={availabilityNote}
            onChange={(e) => setAvailabilityNote(e.target.value)}
            placeholder="Weekday evenings…"
            hint="Optional prose — bookable times live under Calendar"
          />
        </FieldGroup>
        <Button type="submit" loading={submitting}>
          Publish profile
        </Button>
      </form>
    </Panel>
  );
}
