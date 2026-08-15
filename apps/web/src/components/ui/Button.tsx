import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-brass text-ink hover:bg-brass-press active:bg-brass-press disabled:hover:bg-brass shadow-[0_8px_24px_rgba(201,166,107,0.18)]',
  secondary:
    'bg-transparent text-cream border border-line hover:border-mist/40 hover:bg-surface-2/60',
  ghost: 'bg-transparent text-mist hover:text-cream hover:bg-surface/80',
  danger: 'bg-transparent text-danger border border-danger/30 hover:bg-danger/10',
};

const base =
  'inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-[15px] font-medium tracking-wide transition-[background-color,transform,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        base,
        'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}
