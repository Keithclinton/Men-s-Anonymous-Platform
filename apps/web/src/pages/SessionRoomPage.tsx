import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, isUnimplemented } from '../api/errors';
import { getBooking, reportBooking } from '../api/bookings';
import { getProvider } from '../api/providers';
import { listProviderReveals } from '../api/reveals';
import { endSession, startSession } from '../api/sessions';
import type { Booking, ProviderProfile, RevealGrant } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { ChatRoom } from '../components/session/ChatRoom';
import { SessionTimer } from '../components/session/SessionTimer';
import { VideoRoom } from '../components/session/VideoRoom';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Panel } from '../components/layout/Panel';
import { StatusBadge } from '../components/ui/Chip';
import { TextArea } from '../components/ui/Field';
import { channelLabel, formatWhen, publicHandle, revealLevelLabel } from '../lib/format';
import { bookingChannel, sessionHasEnded, sessionIsLive } from '../lib/session';

export function SessionRoomPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [grant, setGrant] = useState<RevealGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('abuse');
  const [reportDetails, setReportDetails] = useState('');
  const [reportNote, setReportNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const row = await getBooking(id);
    setBooking(row);
    try {
      setProvider(await getProvider(row.providerId));
    } catch {
      setProvider(null);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t open the room.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') return;
    void listProviderReveals()
      .then((rows) => {
        const match = rows.find((g) => g.active && (g.bookingId === id || !g.bookingId));
        setGrant(match ?? null);
      })
      .catch(() => setGrant(null));
  }, [id, user]);

  if (!user) return null;

  const isClient = Boolean(booking && user.id === booking.clientId);
  const isProvider = Boolean(booking && user.id === booking.providerId);
  const allowed = isClient || isProvider;
  const channel = booking ? bookingChannel(booking) : 'CHAT';
  const live = booking ? sessionIsLive(booking) : false;
  const ended = booking ? sessionHasEnded(booking) : false;
  const selfHandle =
    user.providerProfile?.displayName || publicHandle(user.username, user.role);
  const revealedName = [grant?.firstName, grant?.fullName].filter(Boolean).join(' · ');
  const peerHandle = isClient
    ? provider?.displayName ?? 'Provider'
    : revealedName || booking?.clientHandle || 'Client';

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

  async function onReport() {
    try {
      await reportBooking(id, { reason: reportReason, details: reportDetails.trim() || undefined });
      setReportNote('Report sent.');
      setReportOpen(false);
    } catch (err) {
      setReportNote(
        isUnimplemented(err)
          ? 'Report queued on this device. Backend needs POST /bookings/:id/report.'
          : err instanceof ApiError
            ? err.message
            : 'Couldn’t send report.',
      );
      setReportOpen(false);
    }
  }

  return (
    <AppShell backTo={`/bookings/${id}`} backLabel="Session" title={channel === 'CHAT' ? '1:1 chat' : 'Video'}>
      <div className="mb-3">
        <CrisisBanner compact />
      </div>
      {loading ? <p className="py-10 text-center text-[14px] text-mist">Opening room…</p> : null}
      {error ? (
        <div className="mb-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
      {reportNote ? (
        <div className="mb-3">
          <Notice>{reportNote}</Notice>
        </div>
      ) : null}

      {booking && !allowed ? <Notice>This room is only for the client and provider on the booking.</Notice> : null}

      {booking && allowed ? (
        <div className="flex min-h-[calc(100dvh-14rem)] flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {isProvider && grant?.photoUrl ? (
                <img src={grant.photoUrl} alt="" className="size-12 shrink-0 rounded-2xl object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="font-display text-xl text-cream">{peerHandle}</p>
                {isProvider && grant ? (
                  <p className="mt-0.5 text-[12px] text-sage">{revealLevelLabel(grant.level)} granted</p>
                ) : (
                  <p className="mt-0.5 text-[13px] text-mist">
                    {channelLabel(channel)} · {formatWhen(booking.scheduledStart)} · {booking.durationMin} min
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {live ? <SessionTimer booking={booking} onExpire={() => void onEnd()} /> : null}
              <StatusBadge tone={live ? 'sage' : ended ? 'neutral' : 'brass'}>
                {live ? 'Live' : ended ? 'Ended' : 'Not started'}
              </StatusBadge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!live && !ended ? (
              <div className="w-full sm:w-36">
                <Button loading={acting} onClick={() => void onStart()}>
                  Start
                </Button>
              </div>
            ) : null}
            {live ? (
              <div className="w-full sm:w-36">
                <Button variant="secondary" loading={acting} onClick={() => void onEnd()}>
                  End
                </Button>
              </div>
            ) : null}
            <div className="w-full sm:w-36">
              <Button variant="ghost" onClick={() => navigate(`/bookings/${id}`)}>
                Leave room
              </Button>
            </div>
            <div className="w-full sm:w-36">
              <Button variant="danger" onClick={() => setReportOpen((v) => !v)}>
                Report
              </Button>
            </div>
          </div>

          {reportOpen ? (
            <Panel className="p-4">
              <label className="text-[11px] uppercase tracking-[0.14em] text-mist">Reason</label>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-ink/50 px-3 text-[14px] text-cream"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="abuse">Abuse / harassment</option>
                <option value="safety">Safety concern</option>
                <option value="spam">Spam</option>
                <option value="other">Other</option>
              </select>
              <TextArea
                label="Details"
                name="reportDetails"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
              <Button className="mt-3" onClick={() => void onReport()}>
                Submit report
              </Button>
            </Panel>
          ) : null}

          {channel === 'CHAT' ? (
            <ChatRoom
              bookingId={id}
              selfId={user.id}
              selfHandle={selfHandle}
              peerHandle={peerHandle}
              live={live}
              ended={ended}
            />
          ) : (
            <VideoRoom bookingId={id} peerHandle={peerHandle} live={live} ended={ended} />
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
