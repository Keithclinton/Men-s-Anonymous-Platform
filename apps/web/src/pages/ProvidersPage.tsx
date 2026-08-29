import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { listProviders } from '../api/providers';
import type { ProviderKind, ProviderProfile } from '../api/types';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Chip } from '../components/ui/Chip';
import { Notice } from '../components/ui/Notice';
import { formatKes, providerKindLabel } from '../lib/format';

const SPECIALTIES = ['All', 'career', 'relationships', 'mental health', 'leadership'] as const;
const KINDS: Array<'All' | ProviderKind> = ['All', 'COUNSELOR', 'MODERATOR'];

export function ProvidersPage() {
  const [specialty, setSpecialty] = useState<(typeof SPECIALTIES)[number]>('All');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('All');
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listProviders({
      specialty: specialty === 'All' ? undefined : specialty,
      kind: kind === 'All' ? undefined : kind,
    })
      .then((rows) => {
        if (!cancelled) setProviders(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Couldn’t load providers.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [specialty, kind]);

  return (
    <AppShell
      title="Find support"
      subtitle="Browse counselors and moderators, or auto-match by specialty if you’d rather not pick."
    >
      <p className="mb-5 text-[14px] text-mist">
        Prefer a queue?{' '}
        <Link to="/match" className="text-cream underline decoration-line underline-offset-4">
          Auto-match me
        </Link>
        .
      </p>

      <div className="mb-5 flex flex-col gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {KINDS.map((item) => (
            <Chip key={item} active={kind === item} onClick={() => setKind(item)}>
              {item === 'All' ? 'All kinds' : providerKindLabel(item)}
            </Chip>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {SPECIALTIES.map((item) => (
            <Chip key={item} active={specialty === item} onClick={() => setSpecialty(item)}>
              {item === 'All' ? 'All specialties' : item}
            </Chip>
          ))}
        </div>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {loading ? (
        <p className="py-10 text-center text-[14px] text-mist">Loading…</p>
      ) : providers.length === 0 ? (
        <Panel className="p-6">
          <p className="text-[14px] leading-6 text-mist">
            No published providers yet
            {kind !== 'All' ? ` (${providerKindLabel(kind).toLowerCase()}s)` : ''}
            {specialty !== 'All' ? ` for “${specialty}”` : ''}.
          </p>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => (
            <li key={provider.userId}>
              <Link to={`/providers/${provider.userId}`} className="block h-full">
                <Panel className="flex h-full flex-col p-5 transition hover:border-brass/35">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-sage">
                        {providerKindLabel(provider.kind)}
                      </p>
                      <h2 className="mt-1 font-display text-[1.35rem] tracking-tight text-cream">
                        {provider.displayName}
                      </h2>
                    </div>
                    <span className="shrink-0 text-[12px] text-brass">
                      {provider.rateCard ? `from ${formatKes(provider.rateCard.minimumRate)}` : 'Rates TBD'}
                    </span>
                  </div>
                  {provider.bio ? (
                    <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-mist">{provider.bio}</p>
                  ) : (
                    <p className="mt-2 text-[13px] text-mist/70">No bio yet</p>
                  )}
                  {provider.specialties.length > 0 ? (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      {provider.specialties.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-line bg-ink/40 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-mist"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
