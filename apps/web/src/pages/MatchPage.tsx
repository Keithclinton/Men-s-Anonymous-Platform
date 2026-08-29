import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { requestMatch } from '../api/matching';
import type { ProviderKind, SessionChannelType } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import { defaultScheduleInput, localInputToIso } from '../lib/format';
import { getIntake } from '../lib/intake';

const DURATIONS = [30, 45, 60, 90] as const;

export function MatchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const intake = user ? getIntake(user.id) : null;
  const [specialty, setSpecialty] = useState(intake?.focus ?? 'career');
  const [kind, setKind] = useState<'ANY' | ProviderKind>(
    intake?.who === 'COUNSELOR' || intake?.who === 'MODERATOR' ? intake.who : 'ANY',
  );
  const [channel, setChannel] = useState<SessionChannelType>(intake?.channel ?? 'CHAT');
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS)[number]>(30);
  const [when, setWhen] = useState(defaultScheduleInput);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && user.role !== 'CLIENT') {
    return (
      <AppShell backTo="/providers" backLabel="Find" title="Auto-match">
        <Notice>Only clients can request a match.</Notice>
      </AppShell>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const booking = await requestMatch({
        specialty: specialty.trim(),
        kind: kind === 'ANY' ? undefined : kind,
        scheduledStart: localInputToIso(when),
        durationMin,
        channelType: channel,
      });
      navigate(`/bookings/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t request a match.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      backTo="/providers"
      backLabel="Find"
      title="Get matched"
      subtitle="Don’t pick a person — tell us specialty and kind. We assign the least-loaded match; they have 15 minutes to accept."
    >
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col gap-3">
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Panel className="flex flex-col gap-4 p-5 lg:p-6">
            <FieldGroup>
              <Field
                label="Specialty"
                name="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="career"
                required
              />
              <Field
                label="When"
                type="datetime-local"
                name="scheduledStart"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
            </FieldGroup>

            <Segmented
              legend="Kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'ANY', label: 'Either', hint: 'Any kind' },
                { value: 'COUNSELOR', label: 'Counselor', hint: 'Licensed path' },
                { value: 'MODERATOR', label: 'Moderator', hint: 'Peer support' },
              ]}
            />

            <Segmented
              legend="How"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'CHAT', label: '1:1 chat', hint: 'Text' },
                { value: 'VIDEO', label: 'Video', hint: 'Anonymous OK' },
              ]}
            />

            <fieldset>
              <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist">
                Length
              </legend>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMin(mins)}
                    className={
                      durationMin === mins
                        ? 'min-h-11 rounded-full border border-brass/60 bg-surface-2 text-[13px] text-cream'
                        : 'min-h-11 rounded-full border border-line text-[13px] text-mist'
                    }
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </fieldset>
          </Panel>
          <Button type="submit" loading={submitting}>
            Request a match
          </Button>
        </div>
        <aside className="hidden lg:block">
          <Panel className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">How it works</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-5 text-mist">
              <li>We pick the least-loaded published provider for that specialty.</li>
              <li>They have 15 minutes to accept.</li>
              <li>Once confirmed, pay and join from the session thread.</li>
            </ol>
          </Panel>
        </aside>
      </form>
    </AppShell>
  );
}
