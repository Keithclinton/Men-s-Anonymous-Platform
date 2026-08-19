import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/errors';
import { updateMyProfile } from '../api/users';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import { cn } from '../lib/cn';
import { useAuth } from '../auth/useAuth';

const SPECIALTIES = ['career', 'relationships', 'mental health', 'leadership'] as const;

export function ClientProfilePage() {
  const { user } = useAuth();
  const existing = user?.clientProfile ?? null;

  const [specialties, setSpecialties] = useState<string[]>(existing?.specialties ?? []);
  const [preferredChannel, setPreferredChannel] = useState<'CHAT' | 'VIDEO' | ''>(
    existing?.preferredChannel ?? '',
  );
  const [intakeNotes, setIntakeNotes] = useState(existing?.intakeNotes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleSpecialty(tag: string) {
    setSpecialties((prev) => (prev.includes(tag) ? prev.filter((s) => s !== tag) : [...prev, tag]));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await updateMyProfile({
        specialties,
        preferredChannel: preferredChannel || undefined,
        intakeNotes: intakeNotes.trim() || undefined,
      });
      setNotice('Saved.');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t save. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (user && user.role !== 'CLIENT') {
    return (
      <AppShell title="Your profile">
        <Notice>Client accounts only.</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your profile">
      <p className="mb-4 max-w-[40ch] text-[14px] leading-6 text-mist">
        Optional, and only used to help match you with the right provider. Intake notes are visible only to a
        provider you actually book with — never a public dump.
      </p>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Panel className="p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mist">What brings you here</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((tag) => {
              const selected = specialties.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSpecialty(tag)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-[13px] transition',
                    selected
                      ? 'border-brass/60 bg-surface-2 text-cream'
                      : 'border-line text-mist hover:border-mist/40 hover:text-cream',
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-5">
          <Segmented
            legend="Preferred session type"
            value={preferredChannel || 'CHAT'}
            onChange={(v) => setPreferredChannel(v)}
            options={[
              { value: 'CHAT', label: 'Chat', hint: 'Text-based' },
              { value: 'VIDEO', label: 'Video', hint: 'Face to face, still anonymous' },
            ]}
          />
        </Panel>

        <Panel className="p-5">
          <label
            htmlFor="intakeNotes"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-mist"
          >
            Intake notes
          </label>
          <textarea
            id="intakeNotes"
            value={intakeNotes}
            onChange={(e) => setIntakeNotes(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="What's going on, what you'd like help with…"
            className="min-h-24 w-full resize-y rounded-[1rem] border border-line/90 bg-ink/35 p-3 text-[15px] text-cream placeholder:text-mist/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          />
          <p className="mt-1.5 text-[12px] leading-4 text-mist/75">
            Encrypted. Only the provider you book can read it — never shown in listings.
          </p>
        </Panel>

        <Button type="submit" loading={submitting}>
          Save
        </Button>
      </form>
    </AppShell>
  );
}
