import { useEffect, useState } from 'react';

export function MatchWaitBanner({ createdAt }: { createdAt?: string }) {
  const start = createdAt ? new Date(createdAt).getTime() : Date.now();
  const deadline = start + 15 * 60 * 1000;
  const [left, setLeft] = useState(deadline - Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setLeft(deadline - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  const expired = left <= 0;
  const m = Math.max(0, Math.floor(left / 60000));
  const s = Math.max(0, Math.floor((left % 60000) / 1000));

  return (
    <div className="mt-3 rounded-2xl border border-brass/35 bg-brass/10 px-4 py-3">
      <p className="text-[14px] text-cream">
        {expired ? 'The 15-minute accept window has passed. They may still confirm, or we’ll reassign.' : `${m}:${String(s).padStart(2, '0')} left to accept`}
      </p>
      <p className="mt-1 text-[12px] text-mist">We’ll keep this thread. Payment stays closed until they confirm.</p>
    </div>
  );
}
