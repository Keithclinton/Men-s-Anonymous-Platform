import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getBooking, rescheduleBooking, setBookingReminder } from '../api/bookings';
import { getPaymentStatus, payForBooking } from '../api/billing';
import { ApiError, isUnimplemented } from '../api/errors';
import { getProvider, listProviderSlots } from '../api/providers';
import { endSession, startSession } from '../api/sessions';
import { FeedbackForm } from '../components/ui/FeedbackForm';
import { RevealPanel } from '../components/ui/RevealPanel';
import type { AvailabilitySlot, Booking, Feedback, PaymentStatusResponse, ProviderProfile } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { Button, ButtonLink } from '../components/ui/Button';
import { SlotCalendar } from '../components/ui/SlotCalendar';
import { MatchWaitBanner } from '../components/ui/MatchWaitBanner';
import { StatusBadge } from '../components/ui/Chip';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import {
  bookingStatusLabel,
  bookingStatusTone,
  channelLabel,
  formatKes,
  formatWhen,
  paymentStatusLabel,
  paymentStatusTone,
} from '../lib/format';
import { bookingChannel } from '../lib/session';
import { reminderOn, setReminderLocal } from '../lib/prefs';
import { normalizePhone, phoneError } from '../lib/validation';

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [acting, setActing] = useState(false);
  const [remind, setRemind] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const row = await getBooking(id);
    setBooking(row);
    setRemind(reminderOn(row.id));
    try {
      const profile = await getProvider(row.providerId);
      setProvider(profile);
    } catch {
      setProvider(null);
    }
    if (user?.id === row.clientId || user?.id === row.providerId) {
      try {
        setPayment(await getPaymentStatus(id));
      } catch {
        setPayment(null);
      }
    }
  }, [id, user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load booking.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Poll while STK Push is pending.
  useEffect(() => {
    if (payment?.status !== 'PENDING') return;
    const timer = window.setInterval(() => {
      void getPaymentStatus(id)
        .then(setPayment)
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [id, payment?.status]);

  const phoneErr = phoneError(phone);
  const isClient = Boolean(user && booking && user.id === booking.clientId);
  const isProvider = Boolean(user && booking && user.id === booking.providerId);
  const canPay =
    isClient &&
    booking?.status === 'CONFIRMED' &&
    payment &&
    (payment.status === 'NOT_INITIATED' || payment.status === 'FAILED');
  const canStart =
    Boolean(booking) &&
    booking!.status === 'CONFIRMED' &&
    !booking!.session?.startedAt &&
    (isProvider || payment?.status === 'SUCCEEDED');
  const canEnd = Boolean(booking?.session?.startedAt && !booking.session.endedAt);
  const canCancel =
    Boolean(booking) && booking!.status !== 'COMPLETED' && booking!.status !== 'CANCELLED';

  async function onPay(event: FormEvent) {
    event.preventDefault();
    setPhoneTouched(true);
    if (phoneErr || !phone.trim()) return;

    setPaying(true);
    setError(null);
    try {
      const result = await payForBooking(id, normalizePhone(phone));
      setPayment({
        status: result.status,
        amount: payment?.amount ?? null,
        externalRef: result.externalRef,
      });
      const status = await getPaymentStatus(id);
      setPayment(status);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Payment could not start. M-Pesa may not be configured on the API yet.',
      );
    } finally {
      setPaying(false);
    }
  }

  async function onStart() {
    setActing(true);
    setError(null);
    try {
      await startSession(id);
      await refresh();
      navigate(`/bookings/${id}/room`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t start the session.');
    } finally {
      setActing(false);
    }
  }

  async function onEnd() {
    setActing(true);
    setError(null);
    try {
      await endSession(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t end the session.');
    } finally {
      setActing(false);
    }
  }

  async function onCancel() {
    if (!window.confirm('Cancel this booking?')) return;
    setActing(true);
    setError(null);
    try {
      await cancelBooking(id);
      navigate('/bookings', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t cancel.');
    } finally {
      setActing(false);
    }
  }

  return (
    <AppShell backTo="/bookings" backLabel="Sessions">
      <div className="mb-3">
        <CrisisBanner compact />
      </div>
      {loading ? <p className="py-10 text-center text-[14px] text-mist">Loading…</p> : null}
      {error ? (
        <div className="mb-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      {booking ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
          <div className="flex flex-col gap-3">
            <Panel className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">Session</p>
                  <h1 className="mt-2 font-display text-[1.65rem] tracking-tight text-cream md:text-[1.85rem]">
                    {formatWhen(booking.scheduledStart)}
                  </h1>
                  <p className="mt-2 text-[14px] text-mist">
                    {provider?.displayName ?? 'Provider'} · {channelLabel(bookingChannel(booking))} ·{' '}
                    {booking.durationMin} min
                  </p>
                </div>
                <StatusBadge tone={bookingStatusTone(booking.status)}>
                  {bookingStatusLabel(booking.status)}
                </StatusBadge>
              </div>
            </Panel>

            {isClient && booking.status === 'REQUESTED' ? (
              <Panel className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Waiting</p>
                <p className="mt-2 text-[14px] leading-6 text-mist">
                  The provider has 15 minutes to accept this auto-match. Payment opens once they confirm.
                </p>
                <MatchWaitBanner createdAt={booking.createdAt} />
              </Panel>
            ) : isClient ? (
              <Panel className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Payment</p>
                  {payment ? (
                    <StatusBadge tone={paymentStatusTone(payment.status)}>
                      {paymentStatusLabel(payment.status)}
                    </StatusBadge>
                  ) : null}
                </div>
                <p className="mt-2 text-[14px] text-cream">
                  {paymentStatusLabel(payment?.status ?? 'NOT_INITIATED')}
                  {payment?.amount != null ? ` · ${formatKes(payment.amount)}` : ''}
                </p>

                {payment?.status === 'PENDING' ? (
                  <Notice>
                    Check your phone and enter your M-Pesa PIN. This screen updates automatically.
                  </Notice>
                ) : null}

                {payment?.status === 'SUCCEEDED' ? (
                  <p className="mt-2 text-[13px] text-mist">Paid. You can start the session when you’re ready.</p>
                ) : null}

                {canPay ? (
                  <form onSubmit={onPay} className="mt-4 flex flex-col gap-3" noValidate>
                    <FieldGroup>
                      <Field
                        label="M-Pesa phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="07… or +2547…"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        error={phoneTouched ? phoneErr || (!phone.trim() ? 'Phone is required.' : null) : null}
                        hint="Used only for this charge. Not shown to counselors."
                      />
                    </FieldGroup>
                    <Button type="submit" loading={paying}>
                      Pay with M-Pesa
                    </Button>
                  </form>
                ) : null}
              </Panel>
            ) : isProvider && booking.status === 'CONFIRMED' ? (
              <Panel className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Payment</p>
                <p className="mt-2 text-[14px] text-cream">
                  {payment ? paymentStatusLabel(payment.status) : 'Client pays before you start. Status appears here when the API allows it.'}
                </p>
              </Panel>
            ) : null}

            {isClient && booking.status !== 'CANCELLED' ? (
              <RevealPanel providerId={booking.providerId} bookingId={booking.id} />
            ) : null}

            {isClient && booking.status === 'COMPLETED' ? (
              <div className="max-w-xs">
                <ButtonLink to={`/providers/${booking.providerId}/book`}>Book {provider?.displayName ?? 'them'} again</ButtonLink>
              </div>
            ) : null}

            {isClient && booking.status === 'COMPLETED' && booking.session ? (
              <FeedbackForm
                sessionId={booking.session.id}
                existing={booking.session.feedback}
                onSubmitted={(feedback: Feedback) => {
                  setBooking((prev) =>
                    prev?.session
                      ? { ...prev, session: { ...prev.session, feedback } }
                      : prev,
                  );
                }}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Panel className="flex flex-col gap-3 p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Room</p>
              {booking.session?.startedAt && !booking.session.endedAt ? (
                <>
                  <p className="text-[14px] leading-6 text-mist">
                    {bookingChannel(booking) === 'CHAT'
                      ? 'Session is live. Open 1:1 chat to talk in this thread — no camera.'
                      : 'Session is live. Open the video room. A live face is not a reveal; the nameplate stays a handle.'}
                  </p>
                  <ButtonLink to={`/bookings/${booking.id}/room`}>
                    {bookingChannel(booking) === 'CHAT' ? 'Open 1:1 chat' : 'Open video room'}
                  </ButtonLink>
                </>
              ) : booking.session?.endedAt ? (
                <p className="text-[14px] text-mist">This session has ended.</p>
              ) : (
                <p className="text-[14px] text-mist">
                  {bookingChannel(booking) === 'CHAT'
                    ? 'After payment, start the session and the 1:1 chat room opens here.'
                    : 'After payment, start the session and join video from here. Camera stays off until you turn it on.'}
                </p>
              )}

              {canStart ? (
                <Button loading={acting} onClick={() => void onStart()}>
                  Start {bookingChannel(booking) === 'CHAT' ? '1:1 chat' : 'video'}
                </Button>
              ) : null}
              {canEnd ? (
                <Button variant="secondary" loading={acting} onClick={() => void onEnd()}>
                  End session
                </Button>
              ) : null}
              {canCancel && booking.status === 'CONFIRMED' && isClient ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRescheduleOpen((v) => !v);
                    if (!rescheduleOpen) {
                      void listProviderSlots(booking.providerId)
                        .then((rows) => {
                          setSlots(rows.filter((s) => !s.bookingId));
                          setSlotId(rows.find((s) => !s.bookingId)?.id ?? null);
                        })
                        .catch(() => setSlots([]));
                    }
                  }}
                >
                  Reschedule
                </Button>
              ) : null}

              {rescheduleOpen ? (
                <div className="rounded-2xl border border-line p-3">
                  <SlotCalendar slots={slots} selectedId={slotId} onSelect={setSlotId} />
                  <Button
                    className="mt-3"
                    loading={acting}
                    disabled={!slotId}
                    onClick={() => {
                      if (!slotId) return;
                      setActing(true);
                      void rescheduleBooking(id, slotId)
                        .then(() => refresh())
                        .catch((err) =>
                          setError(
                            isUnimplemented(err)
                              ? 'Reschedule needs POST /bookings/:id/reschedule on the API.'
                              : err instanceof ApiError
                                ? err.message
                                : 'Couldn’t reschedule.',
                          ),
                        )
                        .finally(() => {
                          setActing(false);
                          setRescheduleOpen(false);
                        });
                    }}
                  >
                    Confirm new slot
                  </Button>
                </div>
              ) : null}

              {isClient && booking.status === 'CONFIRMED' ? (
                <label className="flex items-center gap-3 text-[13px] text-mist">
                  <input
                    type="checkbox"
                    className="size-4 accent-brass"
                    checked={remind}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setRemind(on);
                      setReminderLocal(id, on);
                      void setBookingReminder(id, on).catch(() => undefined);
                    }}
                  />
                  Text me an hour before (generic SMS — no session wording)
                </label>
              ) : null}

              {canCancel ? (
                <Button variant="danger" loading={acting} onClick={() => void onCancel()}>
                  Cancel booking
                </Button>
              ) : null}
            </Panel>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
