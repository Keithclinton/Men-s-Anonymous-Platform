import type { ComponentType, SVGProps } from 'react';
import type { UserRole } from '../api/types';
import {
  BookIcon,
  BriefcaseIcon,
  CalendarIcon,
  CompassIcon,
  HomeIcon,
  ShieldIcon,
  SparkIcon,
} from '../components/icons';

export type NavItem = {
  to: string;
  label: string;
  hint: string;
  end?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export function navForRole(role: UserRole | undefined): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { to: '/home', label: 'Home', hint: 'Overview', end: true, icon: HomeIcon },
      { to: '/admin', label: 'Console', hint: 'Operations', icon: ShieldIcon },
      { to: '/library', label: 'Library', hint: 'Public content', icon: BookIcon },
    ];
  }
  if (role === 'PROVIDER') {
    return [
      { to: '/home', label: 'Home', hint: 'Today', end: true, icon: HomeIcon },
      { to: '/provider', label: 'Desk', hint: 'Your practice', icon: BriefcaseIcon },
      { to: '/bookings', label: 'Sessions', hint: 'Requests', icon: CalendarIcon },
      { to: '/library', label: 'Library', hint: 'Groups & reads', icon: BookIcon },
    ];
  }
  return [
    { to: '/home', label: 'Home', hint: 'Start', end: true, icon: HomeIcon },
    { to: '/providers', label: 'Find', hint: 'Browse', icon: CompassIcon },
    { to: '/match', label: 'Match', hint: 'Auto-assign', icon: SparkIcon },
    { to: '/bookings', label: 'Sessions', hint: 'Bookings', icon: CalendarIcon },
    { to: '/library', label: 'Library', hint: 'Groups & reads', icon: BookIcon },
  ];
}
