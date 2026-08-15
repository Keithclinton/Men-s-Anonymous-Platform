import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Mark } from './Mark';

export function Wordmark({
  to,
  size = 'md',
}: {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const mark = (
    <span className="inline-flex items-center gap-2.5">
      <Mark
        className={cn(
          size === 'sm' && 'size-7',
          size === 'md' && 'size-9',
          size === 'lg' && 'size-12',
        )}
      />
      <span className="inline-flex items-baseline gap-2">
        <span
          className={cn(
            'font-display tracking-tight text-cream',
            size === 'sm' && 'text-[1.35rem] leading-none',
            size === 'md' && 'text-2xl leading-none',
            size === 'lg' && 'text-4xl leading-none',
          )}
        >
          MAP
        </span>
        {size !== 'sm' ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-mist">
            Private
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!to) return mark;
  return (
    <Link
      to={to}
      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
    >
      {mark}
    </Link>
  );
}
