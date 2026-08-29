import type {
  BookingStatus,
  PaymentStatus,
  ProviderKind,
  RevealLevel,
  SessionChannelType,
  StaffRole,
} from '../api/types';

export function formatKes(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `KSh ${amount.toLocaleString('en-KE')}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function channelLabel(channel: SessionChannelType): string {
  return channel === 'VIDEO' ? 'Video' : '1:1 chat';
}

export function providerKindLabel(kind: ProviderKind | undefined): string {
  return kind === 'MODERATOR' ? 'Moderator' : 'Counselor';
}

export function staffRoleLabel(role: StaffRole | null | undefined): string {
  switch (role) {
    case 'SUPPORT_AGENT':
      return 'Support';
    case 'STAFF_MODERATOR':
      return 'Staff moderator';
    case 'COMPLIANCE_OFFICER':
      return 'Compliance';
    case 'SUPER_ADMIN':
      return 'Super admin';
    default:
      return 'Admin';
  }
}

export function roleHeadline(user: {
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN';
  staffRole?: StaffRole | null;
  providerProfile?: { kind?: ProviderKind } | null;
}): string {
  if (user.role === 'PROVIDER') {
    return user.providerProfile?.kind === 'MODERATOR' ? 'Moderator' : 'Counselor';
  }
  if (user.role === 'ADMIN') return staffRoleLabel(user.staffRole);
  return 'Client';
}

/** Generated seed handles are unreadable; show a human label in chrome. */
export function publicHandle(username: string, role?: 'CLIENT' | 'PROVIDER' | 'ADMIN'): string {
  if (/^provider_[0-9a-f-]{8,}/i.test(username)) {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'PROVIDER') return 'Provider';
  }
  return username;
}

export function bookingStatusTone(status: BookingStatus): 'neutral' | 'brass' | 'sage' | 'danger' {
  switch (status) {
    case 'REQUESTED':
      return 'brass';
    case 'CONFIRMED':
      return 'sage';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function paymentStatusTone(status: PaymentStatus): 'neutral' | 'brass' | 'sage' | 'danger' {
  switch (status) {
    case 'SUCCEEDED':
      return 'sage';
    case 'PENDING':
      return 'brass';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function bookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'REQUESTED':
      return 'Awaiting provider';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'NOT_INITIATED':
      return 'Not paid';
    case 'PENDING':
      return 'Waiting on phone';
    case 'SUCCEEDED':
      return 'Paid';
    case 'FAILED':
      return 'Failed';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

export function revealLevelLabel(level: RevealLevel): string {
  switch (level) {
    case 'ANONYMOUS':
      return 'Handle only';
    case 'FIRST_NAME':
      return 'First name';
    case 'FULL_NAME':
      return 'Full name';
    case 'NAME_PHOTO':
      return 'Name + photo';
    default:
      return level;
  }
}

export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function defaultScheduleInput(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function estimateAmount(
  durationMin: number,
  rateCard: { minimumRate: number; hourlyRate: number } | null | undefined,
): number | null {
  if (!rateCard) return null;
  if (durationMin <= 30) return rateCard.minimumRate;
  return Math.ceil((rateCard.hourlyRate * durationMin) / 60);
}
