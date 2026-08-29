import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import { saveIntake, type IntakeAnswers } from '../lib/intake';

export function IntakePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [focus, setFocus] = useState('career');
  const [who, setWho] = useState<IntakeAnswers['who']>('EITHER');
  const [channel, setChannel] = useState<IntakeAnswers['channel']>('CHAT');
  const [danger, setDanger] = useState<IntakeAnswers['danger']>('no');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    saveIntake(user.id, {
      focus,
      who,
      channel,
      danger,
      completedAt: new Date().toISOString(),
    });
    navigate(danger === 'yes' ? '/home' : '/home', { replace: true });
  }

  return (
    <AppShell title="A few questions" subtitle="Stays on this device until the API stores intake. Helps matching. Not a diagnosis.">
      <CrisisBanner />
      {danger === 'yes' ? (
        <div className="mt-3">
          <Notice tone="danger">
            If you are in danger now, use the numbers above. MAP is not an emergency service. You can still continue as a
            handle when you are safe.
          </Notice>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <Panel className="flex flex-col gap-4 p-5">
          <fieldset>
            <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist">Focus</legend>
            <div className="grid grid-cols-2 gap-2">
              {['career', 'relationships', 'mental health', 'leadership'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFocus(item)}
                  className={
                    focus === item
                      ? 'min-h-12 rounded-2xl border border-brass/60 bg-surface-2 px-3 text-[13px] text-cream'
                      : 'min-h-12 rounded-2xl border border-line px-3 text-[13px] text-mist'
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <Segmented
            legend="Who"
            value={who}
            onChange={setWho}
            options={[
              { value: 'EITHER', label: 'Either', hint: 'Match decides' },
              { value: 'COUNSELOR', label: 'Counselor', hint: 'Licensed path' },
              { value: 'MODERATOR', label: 'Moderator', hint: 'Lighter check-in' },
            ]}
          />
          <Segmented
            legend="How"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'CHAT', label: '1:1 chat', hint: 'Text' },
              { value: 'VIDEO', label: 'Video', hint: 'Anonymous OK' },
            ]}
          />
          <Segmented
            legend="Are you in immediate danger?"
            value={danger}
            onChange={setDanger}
            options={[
              { value: 'no', label: 'No', hint: 'Continue' },
              { value: 'yes', label: 'Yes', hint: 'See crisis numbers' },
            ]}
          />
        </Panel>
        <Button type="submit">Continue to MAP</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!user) return;
            saveIntake(user.id, {
              focus,
              who,
              channel,
              danger: 'no',
              completedAt: new Date().toISOString(),
            });
            navigate('/home', { replace: true });
          }}
        >
          Skip for now
        </Button>
      </form>
    </AppShell>
  );
}
