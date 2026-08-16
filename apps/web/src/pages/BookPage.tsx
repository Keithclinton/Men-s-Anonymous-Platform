import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { ApiError } from '../api/errors';
import { getProvider, listProviderSlots } from '../api/providers';
import type { AvailabilitySlot, ProviderProfile, SessionChannelType } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import {
  channelLabel,
  estimateAmount,
  formatKes,
  formatWhen,
  providerKindLabel,
} from '../lib/format';

export function BookPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [channel, setChannel] = useState<SessionChannelType>('CHAT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([getProvider(id), listProviderSlots(id)])
      .then(([row, openSlots]) => {
        if (cancelled) return;
        setProvider(row);
        setSlots(openSlots);
        setSlotId(openSlots[0]?.id ?? null);
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

  const selected = useMemo(
    () => slots.find((slot) => slot.id === slotId) ?? null,
    [slots, slotId],
  );

  const estimate = useMemo(
    () => (selected ? estimateAmount(selected.durationMin, provider?.rateCard) : null),
    [selected, provider?.rateCard],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!provider || user?.role !== 'CLIENT' || !selected) return;

    setError(null);
    setSubmitting(true);
    try {
      const booking = await createBooking({
        providerId: provider.userId,
        slotId: selected.id,
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
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sage">
              {providerKindLabel(provider.kind)}
            </p>
            <p className="mt-1 font-display text-xl text-cream">{provider.displayName}</p>
            <p className="mt-1 text-[13px] text-mist">
              {channelLabel(channel)}
              {selected ? ` · ${selected.durationMin} min` : ''}
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
                Open slots
              </legend>
              {slots.length === 0 ? (
                <p className="text-[13px] leading-5 text-mist">
                  This provider hasn’t published open slots yet. Try auto-match, or check back later.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSlotId(slot.id)}
                      className={
                        slotId === slot.id
                          ? 'rounded-xl border border-brass/60 bg-surface-2 px-3.5 py-3 text-left text-[13px] text-cream'
                          : 'rounded-xl border border-line px-3.5 py-3 text-left text-[13px] text-mist hover:text-cream'
                      }
                    >
                      <span className="block text-cream">{formatWhen(slot.start)}</span>
                      <span className="mt-0.5 block text-[12px] text-mist">{slot.durationMin} min</span>
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          </Panel>

          <Button type="submit" loading={submitting} disabled={!selected}>
            Confirm booking
          </Button>
        </form>
      ) : null}
    </AppShell>
  );
}
