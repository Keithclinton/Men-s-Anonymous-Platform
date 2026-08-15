import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'danger' | 'info';

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'rounded-2xl border px-4 py-3 text-[13px] leading-5',
        tone === 'danger'
          ? 'border-danger/35 bg-danger/10 text-cream'
          : 'border-line bg-surface/80 text-mist',
      )}
    >
      {children}
    </div>
  );
}
