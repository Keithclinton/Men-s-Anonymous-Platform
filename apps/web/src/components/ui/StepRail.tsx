import { cn } from '../../lib/cn';

export function StepRail({
  step,
  steps,
}: {
  step: number;
  steps: string[];
}) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((label, index) => {
        const n = index + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                active || done ? 'bg-brass' : 'bg-line',
              )}
            />
            <span
              className={cn(
                'truncate text-[11px] font-medium uppercase tracking-[0.14em]',
                active ? 'text-cream' : 'text-mist/70',
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span className={cn('h-px min-w-4 flex-1', done ? 'bg-brass/50' : 'bg-line')} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
