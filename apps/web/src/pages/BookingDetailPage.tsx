import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getBooking } from '../api/bookings';
import { getPaymentStatus, payForBooking } from '../api/billing';
import { ApiError } from '../api/errors';
import { getProvider } from '../api/providers';
import { endSession, startSession } from '../api/sessions';
import { FeedbackForm } from '../components/ui/FeedbackForm';
import { RevealPanel } from '../components/ui/RevealPanel';
import type { Booking, Feedback, PaymentStatusResponse, ProviderProfile } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import {
  bookingStatusLabel,
  channelLabel,
  formatKes,
  formatWhen,
  paymentStatusLabel,
} from '../lib/format';
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

  const refresh = useCallback(async () => {
    const row = await getBooking(id);
    setBooking(row);
    try {
      const profile = await getProvider(row.providerId);
      setProvider(profile);
    } catch {
      setProvider(null);
    }
    if (user?.role === 'CLIENT' && user.id === row.clientId) {
      const status = await getPaymentStatus(id);
      setPayment(status);
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
  const canPay =
    isClient &&
    booking?.status === 'CONFIRMED' &&
    payment &&
    (payment.status === 'NOT_INITIATED' || payment.status === 'FAILED');
  const canStart =
    Boolean(booking) &&
    booking!.status === 'CONFIRMED' &&
    payment?.status === 'SUCCEEDED' &&
    !booking!.session?.startedAt;
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
      {loading ? <p className="py-10 text-center text-[14px] text-mist">Loading…</p> : null}
      {error ? (
        <div className="mb-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      {booking ? (
        <div className="flex flex-col gap-3">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">Session</p>
                <h1 className="mt-2 font-display text-[1.55rem] tracking-tight text-cream">
                  {formatWhen(booking.scheduledStart)}
                </h1>
                <p className="mt-2 text-[14px] text-mist">
                  {provider?.displayName ?? 'Provider'} ·{' '}
                  {booking.session ? channelLabel(booking.session.channelType) : '—'} ·{' '}
                  {booking.durationMin} min
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-mist">
                {bookingStatusLabel(booking.status)}
              </span>
            </div>
          </Panel>

          {isClient ? (
            <Panel className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Payment</p>
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
          ) : null}

          <Panel className="flex flex-col gap-3 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Room</p>
            {booking.session?.startedAt && !booking.session.endedAt ? (
              <>
                <p className="text-[14px] leading-6 text-mist">
                  Session is live. Video vendor is not wired yet — room ref is a placeholder.
                </p>
                <p className="break-all rounded-2xl border border-line bg-ink/40 px-3 py-2 font-mono text-[12px] text-cream">
                  {booking.session.roomRef ?? '—'}
                </p>
              </>
            ) : booking.session?.endedAt ? (
              <p className="text-[14px] text-mist">This session has ended.</p>
            ) : (
              <p className="text-[14px] text-mist">
                Start after payment succeeds. Chat/video join lands here once a vendor is chosen.
              </p>
            )}

            {canStart ? (
              <Button loading={acting} onClick={() => void onStart()}>
                Start session
              </Button>
            ) : null}
            {canEnd ? (
              <Button variant="secondary" loading={acting} onClick={() => void onEnd()}>
                End session
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="danger" loading={acting} onClick={() => void onCancel()}>
                Cancel booking
              </Button>
            ) : null}
          </Panel>

          {isClient && booking.status !== 'CANCELLED' ? (
            <RevealPanel providerId={booking.providerId} bookingId={booking.id} />
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
      ) : null}
    </AppShell>
  );
}
