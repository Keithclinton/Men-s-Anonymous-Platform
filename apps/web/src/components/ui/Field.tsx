import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
};

export function Field({ label, hint, error, trailing, id, className, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={inputId}
        className={cn(
          'min-h-10 w-full bg-transparent p-0 text-[16px] text-cream placeholder:text-mist/35',
          'focus:outline-none',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] leading-4 text-mist/75">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string | null;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="px-4 py-3">
      <label htmlFor={inputId} className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-mist">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={4}
        className={cn(
          'min-h-[5.5rem] w-full resize-y bg-transparent p-0 text-[16px] leading-6 text-cream placeholder:text-mist/35',
          'focus:outline-none',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] leading-4 text-mist/75">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-line/90 overflow-hidden rounded-[1.25rem] border border-line/90 bg-ink/35">
      {children}
    </div>
  );
}
