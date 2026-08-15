import type { ReactNode } from 'react';
import { Mark } from '../brand/Mark';

export function Atmosphere({ children }: { children?: ReactNode }) {
  return (
    <div className="atmosphere pointer-events-none absolute inset-0 overflow-hidden">
      <Mark className="absolute -right-16 -top-10 w-[18rem] text-sage opacity-40 sm:w-[22rem] xl:-left-[12%] xl:right-auto xl:top-[10%] xl:w-[70%] xl:opacity-50" />
      {children}
    </div>
  );
}
