import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-2 text-[13px] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70',
        active
          ? 'bg-brass text-ink shadow-[0_8px_20px_rgba(201,166,107,0.22)]'
          : 'border border-line bg-ink/30 text-mist hover:border-mist/40 hover:text-cream',
      )}
    >
      {children}
    </button>
  );
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brass' | 'sage' | 'danger';
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]',
        tone === 'brass' && 'bg-brass/15 text-brass',
        tone === 'sage' && 'bg-sage/15 text-sage',
        tone === 'danger' && 'bg-danger/15 text-danger',
        tone === 'neutral' && 'border border-line text-mist',
      )}
    >
      {children}
    </span>
  );
}
