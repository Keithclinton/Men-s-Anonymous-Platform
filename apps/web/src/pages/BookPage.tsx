import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { ApiError } from '../api/errors';
import { getProvider } from '../api/providers';
import type { ProviderProfile, SessionChannelType } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import {
  channelLabel,
  defaultScheduleInput,
  estimateAmount,
  formatKes,
  localInputToIso,
} from '../lib/format';

const DURATIONS = [30, 45, 60, 90] as const;

export function BookPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [channel, setChannel] = useState<SessionChannelType>('CHAT');
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS)[number]>(30);
  const [when, setWhen] = useState(defaultScheduleInput);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getProvider(id)
      .then((row) => {
        if (!cancelled) setProvider(row);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load provider.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const estimate = useMemo(
    () => estimateAmount(durationMin, provider?.rateCard),
    [durationMin, provider?.rateCard],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!provider || user?.role !== 'CLIENT') return;

    const start = new Date(when);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      setError('Pick a time in the future.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const booking = await createBooking({
        providerId: provider.userId,
        scheduledStart: localInputToIso(when),
        durationMin,
        channelType: channel,
      });
      navigate(`/bookings/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t create the booking.');
    } finally {
      setSubmitting(false);
    }
  }

  if (user && user.role !== 'CLIENT') {
    return (
      <AppShell backTo={`/providers/${id}`} backLabel="Back">
        <Notice>Only client accounts can book sessions.</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell backTo={`/providers/${id}`} backLabel="Back" title="Book">
      {loading ? <p className="py-8 text-center text-[14px] text-mist">Loading…</p> : null}

      {provider ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <Panel className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sage">With</p>
            <p className="mt-1 font-display text-xl text-cream">{provider.displayName}</p>
            <p className="mt-1 text-[13px] text-mist">
              {channelLabel(channel)} · {durationMin} min
              {estimate != null ? ` · about ${formatKes(estimate)}` : ''}
            </p>
          </Panel>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <Panel className="flex flex-col gap-4 p-4">
            <Segmented
              legend="How"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'CHAT', label: '1:1 chat', hint: 'Text only' },
                { value: 'VIDEO', label: 'Video', hint: 'Still anonymous' },
              ]}
            />

            {channel === 'VIDEO' ? (
              <p className="text-[12px] leading-5 text-mist">
                Video while anonymous is allowed. A live face is not the same as revealing your identity on file.
              </p>
            ) : null}

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
                        : 'min-h-11 rounded-full border border-line text-[13px] text-mist hover:text-cream'
                    }
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-mist">
                ≤30 min bills the minimum rate; longer uses the hourly rate.
              </p>
            </fieldset>

            <FieldGroup>
              <Field
                label="When"
                type="datetime-local"
                name="scheduledStart"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
            </FieldGroup>
          </Panel>

          <Button type="submit" loading={submitting}>
            Confirm booking
          </Button>
        </form>
      ) : null}
    </AppShell>
  );
}
