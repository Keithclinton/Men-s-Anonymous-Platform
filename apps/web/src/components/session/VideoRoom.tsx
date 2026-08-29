import { useEffect, useState } from 'react';
import { getSessionJoin, isRelayUnimplemented } from '../../api/sessions';
import { MicIcon, VideoIcon } from '../icons';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

export function VideoRoom({
  bookingId,
  peerHandle,
  live,
  ended,
}: {
  bookingId: string;
  peerHandle: string;
  live: boolean;
  ended: boolean;
}) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [relay, setRelay] = useState<'connecting' | 'live' | 'waiting'>('connecting');
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    if (!live || ended) return;
    let cancelled = false;

    async function pull() {
      try {
        const join = await getSessionJoin(bookingId);
        if (cancelled) return;
        setJoinUrl(join.joinUrl ?? null);
        setRelay(join.joinUrl ? 'live' : 'waiting');
      } catch (err) {
        if (cancelled) return;
        setRelay(isRelayUnimplemented(err) ? 'waiting' : 'waiting');
      }
    }

    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [bookingId, live, ended]);

  if (ended) {
    return (
      <div className="flex min-h-[24rem] flex-1 items-center justify-center rounded-[1.75rem] border border-line/80 bg-ink/40 p-8 text-center">
        <p className="text-[14px] text-mist">This video room has closed.</p>
      </div>
    );
  }

  if (joinUrl) {
    return (
      <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-line/80 bg-ink">
        <iframe
          title="Video session"
          src={joinUrl}
          allow="camera; microphone; display-capture; autoplay"
          className="min-h-[32rem] w-full flex-1 bg-ink"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-line/80 bg-ink/50">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <span className="flex size-24 items-center justify-center rounded-full bg-brass/15 font-display text-3xl text-brass">
          {peerHandle.slice(0, 2).toUpperCase()}
        </span>
        <div className="text-center">
          <p className="font-display text-2xl text-cream">{peerHandle}</p>
          <p className="mt-1 text-[13px] text-mist">
            {live
              ? 'Video vendor isn’t issuing a join URL yet. Camera stays off by default — a live face is not a reveal.'
              : 'Start the session to open the video room.'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em]',
            relay === 'live' ? 'bg-sage/15 text-sage' : 'bg-brass/15 text-brass',
          )}
        >
          {relay === 'live' ? 'Ready' : 'Waiting on API'}
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 border-t border-line/70 px-4 py-4">
        <button
          type="button"
          onClick={() => setMicOn((v) => !v)}
          className={cn(
            'inline-flex size-12 items-center justify-center rounded-full border',
            micOn ? 'border-line text-cream' : 'border-danger/40 bg-danger/15 text-danger',
          )}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          <MicIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setCamOn((v) => !v)}
          className={cn(
            'inline-flex size-12 items-center justify-center rounded-full border',
            camOn ? 'border-line text-cream' : 'border-line bg-ink/60 text-mist',
          )}
          aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
        >
          <VideoIcon className="size-5" />
        </button>
        <div className="max-w-[11rem] flex-1">
          <Button disabled={!joinUrl}>
            {joinUrl ? 'Join video' : 'Join when ready'}
          </Button>
        </div>
      </div>
    </div>
  );
}
