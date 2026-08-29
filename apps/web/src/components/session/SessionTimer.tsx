import { useEffect, useState } from 'react';
import { sessionEndsAt } from '../../lib/session';
import type { Booking } from '../../api/types';

export function SessionTimer({
  booking,
  onExpire,
}: {
  booking: Booking;
  onExpire?: () => void;
}) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    let expired = false;
    const alreadyUp = sessionEndsAt(booking).getTime() - Date.now() <= 0;

    function tick() {
      const end = sessionEndsAt(booking);
      const ms = end.getTime() - Date.now();
      if (ms <= 0) {
        setLabel('Time up');
        if (!expired && !alreadyUp) {
          expired = true;
          onExpire?.();
        }
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLabel(`${m}:${String(s).padStart(2, '0')} left`);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [booking, onExpire]);

  if (!label) return null;
  return (
    <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em] text-mist">
      {label}
    </span>
  );
}
