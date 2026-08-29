import { markTourSeen, tourSeen } from '../../lib/prefs';
import { useState } from 'react';
import { Button } from '../ui/Button';

export function FirstRunTour({ role }: { role: string }) {
  const [open, setOpen] = useState(() => !tourSeen());
  if (!open) return null;

  const steps =
    role === 'PROVIDER'
      ? ['Verify your license on Desk.', 'Publish slots and rates.', 'Accept a match, then join the room.']
      : ['Find a counselor or auto-match.', 'Pay the session on M-Pesa.', 'Join as a handle. Reveal only if you want.'];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:left-[17.25rem]">
      <div className="mx-auto max-w-lg rounded-[1.5rem] border border-line bg-surface-2/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-brass">First time</p>
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-[14px] leading-6 text-mist">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Button
          className="mt-4"
          onClick={() => {
            markTourSeen();
            setOpen(false);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
