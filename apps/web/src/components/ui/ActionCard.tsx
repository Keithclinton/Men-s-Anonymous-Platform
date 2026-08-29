import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '../layout/Panel';
import { cn } from '../../lib/cn';

export function ActionCard({
  to,
  icon,
  kicker,
  title,
  body,
  onClick,
}: {
  to?: string;
  icon?: ReactNode;
  kicker: string;
  title: string;
  body: string;
  onClick?: () => void;
}) {
  const inner = (
    <Panel className="h-full p-5 transition hover:border-brass/35">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sage">{kicker}</p>
        {icon ? <span className="size-5 text-brass">{icon}</span> : null}
      </div>
      <h2 className="mt-3 font-display text-[1.35rem] tracking-tight text-cream">{title}</h2>
      <p className="mt-2 text-[13px] leading-5 text-mist">{body}</p>
    </Panel>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70">
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {inner}
      </button>
    );
  }

  return inner;
}

export function ToolTile({
  active,
  label,
  hint,
  icon,
  onClick,
  badge,
}: {
  active: boolean;
  label: string;
  hint?: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex min-h-[4.5rem] flex-col items-start justify-center rounded-2xl border px-3.5 py-3 text-left transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70',
        active
          ? 'border-brass/55 bg-surface-2 text-cream'
          : 'border-line text-mist hover:border-mist/40 hover:text-cream',
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn('size-5', active ? 'text-brass' : 'text-sage')}>{icon}</span>
        <span className="text-[13px] font-medium text-cream">{label}</span>
      </span>
      {hint ? <span className="mt-1 text-[11px] text-mist">{hint}</span> : null}
      {badge ? (
        <span className="absolute right-2.5 top-2.5 min-w-5 rounded-full bg-brass px-1.5 text-center text-[10px] font-medium text-ink">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
