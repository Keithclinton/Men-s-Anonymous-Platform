import type { ReactNode } from 'react';

export function AnonymityNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[13px] leading-5 text-mist/90">
      {children ??
        'Anonymous by default. Counselors and other members see your handle — not your name, email, or phone.'}
    </p>
  );
}
