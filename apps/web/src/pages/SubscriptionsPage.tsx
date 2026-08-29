import { useEffect, useState, type FormEvent } from 'react';
import {
  createSubscription,
  listMySubscriptions,
  listPlans,
} from '../api/billing';
import { ApiError } from '../api/errors';
import type { Subscription, SubscriptionPlan } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { formatKes, formatWhen } from '../lib/format';

export function SubscriptionsPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mine, setMine] = useState<Subscription[]>([]);
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<'starter' | 'standard'>('starter');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'CLIENT') return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([listPlans(), listMySubscriptions()])
      .then(([p, m]) => {
        if (cancelled) return;
        setPlans(p);
        setMine(m);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load plans.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (user && user.role !== 'CLIENT') {
    return (
      <AppShell backTo="/library" backLabel="Library" title="Plans">
        <Notice>Subscriptions are for client accounts.</Notice>
      </AppShell>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createSubscription({ plan, phone: phone.trim() });
      setNotice('STK push sent — approve on your phone to activate.');
      setMine(await listMySubscriptions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t start subscription.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      backTo="/library"
      backLabel="Library"
      title="Plans"
      subtitle="Phase 2 scaffold — monthly session packs via M-Pesa STK. True auto-renew comes later."
    >

      <Notice>
        Plans are a Phase 2 scaffold. Do not treat this as live auto-renew billing — pay-per-session on a booking is the
        current path.
      </Notice>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
      ) : null}
      {loading ? <p className="py-8 text-center text-[14px] text-mist">Loading…</p> : null}

      {!loading ? (
        <div className="flex flex-col gap-3">
          {mine.some((s) => s.status === 'ACTIVE') ? (
            <Panel className="p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-sage">Active</p>
              {mine
                .filter((s) => s.status === 'ACTIVE')
                .map((s) => (
                  <div key={s.id} className="mt-2">
                    <p className="font-display text-xl text-cream">{s.plan}</p>
                    <p className="mt-1 text-[13px] text-mist">
                      {s.sessionsIncluded} sessions · renews {formatWhen(s.renewalDate)}
                    </p>
                  </div>
                ))}
            </Panel>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p.plan}
                    type="button"
                    onClick={() => setPlan(p.plan)}
                    className={
                      plan === p.plan
                        ? 'rounded-2xl border border-brass/60 bg-surface-2 p-5 text-left'
                        : 'rounded-2xl border border-line p-5 text-left hover:border-mist/40'
                    }
                  >
                    <p className="font-display text-xl text-cream">{p.label}</p>
                    <p className="mt-1 text-[13px] text-mist">
                      {p.sessionsIncluded} sessions · {formatKes(p.amountKes)} / month
                    </p>
                  </button>
                ))}
              </div>
              <Panel className="max-w-md p-5">
                <Field
                  label="M-Pesa phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2547…"
                  required
                />
              </Panel>
              <div className="max-w-md">
                <Button type="submit" loading={submitting}>
                  Subscribe with M-Pesa
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
