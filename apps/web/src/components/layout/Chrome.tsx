import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../brand/Wordmark';

export function Chrome({
  backTo,
  backLabel = 'Back',
  trailing,
  leading,
  markTo = '/',
  hideMarkOnDesktop = false,
}: {
  backTo?: string;
  backLabel?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  markTo?: string;
  hideMarkOnDesktop?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/40 bg-ink/80 px-4 py-2.5 backdrop-blur-md pt-[max(0.65rem,env(safe-area-inset-top))] md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        {backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line/80 bg-surface/50 text-cream transition hover:border-mist/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            <span className="text-lg leading-none">←</span>
          </Link>
        ) : null}
        <span className={hideMarkOnDesktop ? 'md:hidden' : undefined}>
          <Wordmark to={markTo} size="sm" />
        </span>
      </div>
      <div className="shrink-0">{trailing}</div>
    </header>
  );
}
