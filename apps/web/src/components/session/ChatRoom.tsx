import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  isRelayUnimplemented,
  listSessionMessages,
  sendSessionMessage,
} from '../../api/sessions';
import type { SessionMessage } from '../../api/types';
import { SendIcon } from '../icons';
import { cn } from '../../lib/cn';

type Relay = 'connecting' | 'live' | 'local';

function clock(iso: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function ChatRoom({
  bookingId,
  selfId,
  selfHandle,
  peerHandle,
  live,
  ended,
}: {
  bookingId: string;
  selfId: string;
  selfHandle: string;
  peerHandle: string;
  live: boolean;
  ended: boolean;
}) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [relay, setRelay] = useState<Relay>('connecting');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<string | undefined>(undefined);

  const merge = useCallback((incoming: SessionMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((row) => row.id));
      const next = [...prev];
      for (const row of incoming) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        next.push(row);
      }
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      afterRef.current = next.at(-1)?.createdAt;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!live) {
      setRelay('connecting');
      return;
    }

    let cancelled = false;
    let unimplemented = false;
    afterRef.current = undefined;
    setMessages([]);
    setRelay('connecting');

    async function pull() {
      if (unimplemented) return;
      try {
        const rows = await listSessionMessages(bookingId, afterRef.current);
        if (cancelled) return;
        setRelay('live');
        merge(rows);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (isRelayUnimplemented(err)) {
          unimplemented = true;
          setRelay('local');
          return;
        }
        setError(err instanceof Error ? err.message : 'Couldn’t load messages.');
      }
    }

    void pull();
    const timer = window.setInterval(() => {
      if (!cancelled && !unimplemented) void pull();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [bookingId, live, merge]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || ended || !live || sending) return;

    setSending(true);
    setError(null);
    setDraft('');

    const optimistic: SessionMessage = {
      id: `local-${crypto.randomUUID()}`,
      bookingId,
      senderId: selfId,
      senderHandle: selfHandle,
      body,
      createdAt: new Date().toISOString(),
    };
    merge([optimistic]);

    try {
      const saved = await sendSessionMessage(bookingId, body);
      setMessages((prev) => prev.map((row) => (row.id === optimistic.id ? saved : row)));
      setRelay('live');
    } catch (err) {
      if (isRelayUnimplemented(err)) {
        setRelay('local');
      } else {
        setMessages((prev) => prev.filter((row) => row.id !== optimistic.id));
        setDraft(body);
        setError(err instanceof Error ? err.message : 'Message didn’t send.');
      }
    } finally {
      setSending(false);
    }
  }

  const canType = live && !ended;

  return (
    <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-line/80 bg-ink/40">
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">1:1 chat</p>
          <p className="mt-0.5 text-[13px] text-mist">With {peerHandle} · handle only unless they reveal</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em]',
            relay === 'live' && 'bg-sage/15 text-sage',
            relay === 'connecting' && 'border border-line text-mist',
            relay === 'local' && 'bg-brass/15 text-brass',
          )}
        >
          {relay === 'live' ? 'Live' : relay === 'local' ? 'Waiting on API' : 'Connecting'}
        </span>
      </div>

      {live && !ended ? (
        <p className="border-b border-line/70 px-4 py-2 text-[12px] leading-5 text-mist">
          {peerHandle} — presence and typing indicators wait on the room API.
        </p>
      ) : null}

      {relay === 'local' ? (
        <p className="border-b border-line/70 px-4 py-2 text-[12px] leading-5 text-mist">
          Room relay isn’t on the API yet. You can still use this screen; the other person won’t see
          messages until backend ships{' '}
          <span className="text-cream">GET/POST /bookings/:id/session/messages</span>.
        </p>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">
            {ended ? 'This chat is closed.' : live ? 'No messages yet. Start when you’re ready.' : 'Start the session to chat.'}
          </p>
        ) : (
          messages.map((row) => {
            const mine = row.senderId === selfId;
            return (
              <div key={row.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5',
                    mine ? 'bg-brass text-ink' : 'border border-line bg-surface-2 text-cream',
                  )}
                >
                  <p className={cn('text-[11px]', mine ? 'text-ink/70' : 'text-mist')}>
                    {mine ? 'You' : row.senderHandle} · {clock(row.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-5">{row.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="px-4 pb-2 text-[12px] text-danger">{error}</p> : null}

      <form onSubmit={onSend} className="flex items-end gap-2 border-t border-line/70 p-3">
        <label className="sr-only" htmlFor={`chat-${bookingId}`}>
          Message
        </label>
        <textarea
          id={`chat-${bookingId}`}
          rows={2}
          value={draft}
          disabled={!canType}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={ended ? 'Session ended' : canType ? 'Write a message…' : 'Start the session to chat'}
          className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-line bg-ink/50 px-3.5 py-2.5 text-[15px] text-cream placeholder:text-mist/40 focus:border-brass/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canType || sending || !draft.trim()}
          aria-label="Send"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brass text-ink transition hover:bg-brass-press disabled:opacity-40"
        >
          <SendIcon className="size-5" />
        </button>
      </form>
      {canType ? (
        <p className="px-4 pb-3 text-[11px] text-mist">Shift+Enter for a new line.</p>
      ) : null}
    </div>
  );
}
