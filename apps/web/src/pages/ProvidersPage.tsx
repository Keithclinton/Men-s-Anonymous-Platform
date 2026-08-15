import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { listProviders } from '../api/providers';
import type { ProviderProfile } from '../api/types';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Notice } from '../components/ui/Notice';
import { cn } from '../lib/cn';
import { formatKes } from '../lib/format';

const SPECIALTIES = ['All', 'career', 'relationships', 'mental health', 'leadership'] as const;

export function ProvidersPage() {
  const [specialty, setSpecialty] = useState<(typeof SPECIALTIES)[number]>('All');
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listProviders(specialty === 'All' ? undefined : specialty)
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
  }, [specialty]);

  return (
    <AppShell title="Find support">
      <p className="mb-4 max-w-[40ch] text-[14px] leading-6 text-mist">
        Pseudonymous profiles only. Or{' '}
        <Link to="/match" className="text-cream underline decoration-line underline-offset-4">
          auto-match
        </Link>{' '}
        by specialty without picking a person.
      </p>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {SPECIALTIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSpecialty(item)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition',
              specialty === item
                ? 'border-brass/60 bg-surface-2 text-cream'
                : 'border-line text-mist hover:border-mist/40 hover:text-cream',
            )}
          >
            {item === 'All' ? 'All' : item}
          </button>
        ))}
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {loading ? (
        <p className="py-10 text-center text-[14px] text-mist">Loading…</p>
      ) : providers.length === 0 ? (
        <Panel className="p-5">
          <p className="text-[14px] leading-6 text-mist">
            No published providers yet{specialty !== 'All' ? ` for “${specialty}”` : ''}. Check back once
            someone has been verified and gone live.
          </p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {providers.map((provider) => (
            <li key={provider.userId}>
              <Link to={`/providers/${provider.userId}`} className="block">
                <Panel className="p-4 transition hover:border-mist/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-[1.25rem] tracking-tight text-cream">
                        {provider.displayName}
                      </h2>
                      {provider.bio ? (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-mist">{provider.bio}</p>
                      ) : (
                        <p className="mt-1 text-[13px] text-mist/70">No bio yet</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[12px] text-brass">
                      {provider.rateCard ? `from ${formatKes(provider.rateCard.minimumRate)}` : 'Rates TBD'}
                    </span>
                  </div>
                  {provider.specialties.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
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
