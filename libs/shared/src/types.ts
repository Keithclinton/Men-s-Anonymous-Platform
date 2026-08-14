import type {
  BookingStatus,
  PaymentDirection,
  PaymentProvider,
  PaymentStatus,
  SessionChannelType,
  UserRole,
  UserStatus,
} from './enums';

/** Opaque UUID used everywhere outside the Identity Vault. */
export type PseudonymId = string;

export interface JwtPayload {
  sub: PseudonymId;
  role: UserRole;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
}

export interface BookingSummary {
  id: string;
  clientId: PseudonymId;
  providerId: PseudonymId;
  scheduledStart: string;
  durationMin: number;
  status: BookingStatus;
}

export interface SessionMetadata {
  id: string;
  bookingId: string;
  channelType: SessionChannelType;
  startedAt: string | null;
  endedAt: string | null;
}

export interface PaymentRecord {
  id: string;
  userId: PseudonymId;
  provider: PaymentProvider;
  externalRef: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  direction: PaymentDirection;
}

export interface UserSummary {
  id: PseudonymId;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}
