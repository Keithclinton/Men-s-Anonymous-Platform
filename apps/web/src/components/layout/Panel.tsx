import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Panel({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'form';
}) {
  return <Tag className={cn('panel rounded-[1.75rem]', className)}>{children}</Tag>;
}
