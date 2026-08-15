import { cn } from '../../lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  legend,
}: {
  value: T;
  onChange: (value: T) => void;
  legend?: string;
  options: Array<{ value: T; label: string; hint: string }>;
}) {
  return (
    <fieldset>
      {legend ? (
        <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist">{legend}</legend>
      ) : null}
      <div
        className={cn(
          'grid gap-1 rounded-[1.25rem] border border-line/90 bg-ink/35 p-1',
          options.length > 2 ? 'grid-cols-2' : 'grid-cols-2',
        )}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-w-0 rounded-[1rem] px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70',
                selected ? 'bg-surface-2 text-cream shadow-[0_1px_0_rgba(243,239,230,0.08)_inset] ring-1 ring-brass/35' : 'text-mist hover:text-cream',
              )}
            >
              <span className="block text-[13px] font-medium sm:text-[14px]">{option.label}</span>
              <span className={cn('mt-0.5 block text-[10px] leading-4 sm:text-[11px]', selected ? 'text-mist' : 'text-mist/70')}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
