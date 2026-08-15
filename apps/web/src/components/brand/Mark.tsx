import { cn } from '../../lib/cn';

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden className={cn('text-sage', className)}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
      <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="0.8" opacity="0.42" />
      <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="0.9" opacity="0.62" />
      <path
        d="M52 132c24-48 72-48 96 0"
        stroke="var(--color-brass)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M68 118c16-32 48-32 64 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="100" cy="78" r="5.5" fill="var(--color-cream)" />
    </svg>
  );
}
