import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { listProviderFeedback } from '../api/feedback';
import { listMyBookings } from '../api/bookings';
import { acceptMatch, declineMatch } from '../api/matching';
import {
  publishProfile,
  submitVerification,
  updateAvailability,
} from '../api/providers';
import { listProviderReveals } from '../api/reveals';
import type { Booking, Feedback, ProviderProfile, RevealGrant } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import {
  bookingStatusLabel,
  channelLabel,
  formatWhen,
  revealLevelLabel,
} from '../lib/format';

export function ProviderDeskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'requests' | 'profile' | 'verify' | 'reveals' | 'feedback'>(
    'requests',
  );
  const [requests, setRequests] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reveals, setReveals] = useState<RevealGrant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const profile = user?.providerProfile ?? null;

  async function refresh() {
    const [bookings, fb, rev] = await Promise.all([
      listMyBookings(),
      listProviderFeedback().catch(() => [] as Feedback[]),
      listProviderReveals().catch(() => [] as RevealGrant[]),
    ]);
    setRequests(bookings.filter((b) => b.status === 'REQUESTED' && b.providerId === user?.id));
    setFeedback(fb);
    setReveals(rev);
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
    <AppShell title="Provider desk">
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {(
          [
            ['requests', 'Requests'],
            ['profile', 'Profile'],
            ['verify', 'Verify'],
            ['reveals', 'Reveals'],
            ['feedback', 'Feedback'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? 'shrink-0 rounded-full border border-brass/60 bg-surface-2 px-3.5 py-2 text-[13px] text-cream'
                : 'shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] text-mist'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
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
                <p className="text-[14px] text-cream">{formatWhen(booking.scheduledStart)}</p>
                <p className="mt-1 text-[12px] text-mist">
                  {booking.specialty ?? 'General'} ·{' '}
                  {booking.session ? channelLabel(booking.session.channelType) : '—'} ·{' '}
                  {booking.durationMin} min · {bookingStatusLabel(booking.status)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    loading={acting}
                    onClick={() => {
                      setActing(true);
                      void acceptMatch(booking.id)
                        .then(() => refresh())
                        .then(() => navigate(`/bookings/${booking.id}`))
                        .catch((err) =>
                          setError(err instanceof ApiError ? err.message : 'Accept failed.'),
                        )
                        .finally(() => setActing(false));
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    loading={acting}
                    onClick={() => {
                      setActing(true);
                      void declineMatch(booking.id)
                        .then(() => refresh())
                        .catch((err) =>
                          setError(err instanceof ApiError ? err.message : 'Decline failed.'),
                        )
                        .finally(() => setActing(false));
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </Panel>
            ))
          )}
        </div>
      ) : null}

      {tab === 'profile' ? (
        <ProfileForm
          existing={profile}
          onSaved={() => {
            setNotice('Profile saved. Refresh the app if your home card looks stale.');
            window.location.reload();
          }}
          onError={setError}
        />
      ) : null}

      {tab === 'verify' ? (
        <VerifyForm
          onDone={(id) => setNotice(`Verification submitted (${id}). Wait for admin approval.`)}
          onError={setError}
        />
      ) : null}

      {tab === 'reveals' ? (
        <div className="flex flex-col gap-3">
          {reveals.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No active client reveals yet.</p>
            </Panel>
          ) : (
            reveals.map((g) => (
              <Panel key={g.id} className="p-4">
                <p className="text-[14px] text-cream">{revealLevelLabel(g.level)}</p>
                <p className="mt-1 text-[12px] text-mist">
                  Client {g.clientId.slice(0, 8)}…
                  {g.firstName ? ` · ${g.firstName}` : ''}
                  {g.fullName ? ` · ${g.fullName}` : ''}
                </p>
              </Panel>
            ))
          )}
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <div className="flex flex-col gap-3">
          {feedback.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No feedback yet.</p>
            </Panel>
          ) : (
            feedback.map((f) => (
              <Panel key={f.id} className="p-4">
                <p className="text-[14px] text-cream">{f.rating}/5</p>
                {f.comment ? <p className="mt-1 text-[13px] text-mist">{f.comment}</p> : null}
              </Panel>
            ))
          )}
        </div>
      ) : null}
    </AppShell>
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
      const res = await submitVerification({
        licenseNumber: licenseNumber.trim(),
        verifyingBody: verifyingBody.trim() || undefined,
      });
      onDone(res.id);
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
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
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
      onSaved();
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
        <FieldGroup>
          <Field
            label="Display name"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <Field label="Bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
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
          <Field
            label="Availability note"
            name="availability"
            value={availabilityNote}
            onChange={(e) => setAvailabilityNote(e.target.value)}
            placeholder="Weekday evenings…"
          />
        </FieldGroup>
        <Button type="submit" loading={submitting}>
          Publish profile
        </Button>
      </form>
    </Panel>
  );
}
