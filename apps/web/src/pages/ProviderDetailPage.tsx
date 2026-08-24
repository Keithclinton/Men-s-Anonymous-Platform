import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { getProvider } from '../api/providers';
import type { ProviderProfile } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ButtonLink } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { formatKes, providerKindLabel } from '../lib/format';

export function ProviderDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void getProvider(id)
      .then((row) => {
        if (!cancelled) setProvider(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Couldn’t load this profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AppShell backTo="/providers" backLabel="Find">
      {loading ? <p className="py-10 text-center text-[14px] text-mist">Loading…</p> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {provider ? (
        <div className="flex flex-col gap-3">
          <Panel className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">
              {providerKindLabel(provider.kind)}
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,7vw,2.2rem)] tracking-tight text-cream">
              {provider.displayName}
            </h1>
            <p className="mt-3 text-[14px] leading-6 text-mist">
              {provider.bio ?? 'This counselor or moderator has not added a bio yet.'}
            </p>
            {provider.specialties.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {provider.specialties.map((tag) => (
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

          <Panel className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Rates</p>
            {provider.rateCard ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[14px]">
                <div>
                  <dt className="text-mist">Up to 30 min</dt>
                  <dd className="mt-1 text-cream">{formatKes(provider.rateCard.minimumRate)}</dd>
                </div>
                <div>
                  <dt className="text-mist">Hourly after</dt>
                  <dd className="mt-1 text-cream">{formatKes(provider.rateCard.hourlyRate)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-[14px] text-mist">Rates not published yet — booking may fail until they are.</p>
            )}
          </Panel>

          <Panel className="p-5">
            <p className="text-[13px] leading-5 text-mist">
              You stay anonymous by default — including on video. Reveal is optional and scoped later.
            </p>
            {user?.role === 'CLIENT' ? (
              <ButtonLink to={`/providers/${provider.userId}/book`} className="mt-4">
                Book a session
              </ButtonLink>
            ) : (
              <p className="mt-3 text-[13px] text-mist">Sign in as a client to book.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}
