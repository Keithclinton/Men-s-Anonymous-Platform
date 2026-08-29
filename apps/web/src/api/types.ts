export type UserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';
export type StaffRole =
  | 'SUPPORT_AGENT'
  | 'STAFF_MODERATOR'
  | 'COMPLIANCE_OFFICER'
  | 'SUPER_ADMIN';
export type ProviderKind = 'COUNSELOR' | 'MODERATOR';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type SessionChannelType = 'CHAT' | 'VIDEO';
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type BillingType = 'MINIMUM' | 'HOURLY';
export type PaymentStatus =
  | 'NOT_INITIATED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED';
export type RevealLevel = 'ANONYMOUS' | 'FIRST_NAME' | 'FULL_NAME' | 'NAME_PHOTO';
export type ResourceType = 'ARTICLE' | 'VIDEO';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  role?: 'CLIENT' | 'PROVIDER';
  email?: string;
  phone?: string;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface MeResponse {
  id: string;
  username: string;
  role: UserRole;
  staffRole?: StaffRole | null;
  status: UserStatus;
  createdAt: string;
  providerProfile: ProviderProfile | null;
  clientProfile: unknown | null;
}

export interface RateCard {
  minimumRate: number;
  hourlyRate: number;
}

export interface ProviderProfile {
  userId: string;
  displayName: string;
  bio: string | null;
  kind: ProviderKind;
  specialties: string[];
  rateCard: RateCard | null;
  availability: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  start: string;
  durationMin: number;
  bookingId: string | null;
  createdAt?: string;
}

export interface Feedback {
  id: string;
  sessionId?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  bookingId?: string;
  channelType: SessionChannelType;
  roomRef: string | null;
  startedAt: string | null;
  endedAt: string | null;
  feedback?: Feedback | null;
}

export interface SessionMessage {
  id: string;
  bookingId: string;
  sessionId?: string;
  senderId: string;
  senderHandle: string;
  body: string;
  createdAt: string;
}

export interface SessionJoin {
  bookingId: string;
  sessionId: string;
  channelType: SessionChannelType;
  /** Short-lived room JWT for Socket.IO / the video vendor. */
  token?: string | null;
  /** Socket.IO path, default `/realtime`. */
  wsPath?: string | null;
  /** Managed WebRTC join URL (Daily / Twilio / Agora). Chat rooms omit this. */
  joinUrl?: string | null;
}

export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  scheduledStart: string;
  durationMin: number;
  billingType: BillingType;
  status: BookingStatus;
  specialty: string | null;
  channelType?: SessionChannelType;
  /** Provider-facing handle for the client. Never vault PII. */
  clientHandle?: string | null;
  declinedProviderIds?: string[];
  session: SessionSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBookingRequest {
  providerId: string;
  slotId?: string;
  scheduledStart?: string;
  durationMin?: number;
  channelType: SessionChannelType;
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  amount: number | null;
  externalRef: string | null;
}

export interface PayResponse {
  externalRef: string;
  status: PaymentStatus;
}

export interface ProviderEarnings {
  currency: string;
  grossSucceeded: number;
  paidOut: number;
  pendingPayout: number;
  available: number;
  recentCharges: Array<{
    amount: number | string;
    createdAt: string;
    bookingId: string | null;
    externalRef: string;
  }>;
  recentPayouts: Array<{
    amount: number | string;
    createdAt: string;
    status: PaymentStatus;
    externalRef: string;
  }>;
}

export interface SubscriptionPlan {
  plan: 'starter' | 'standard';
  label: string;
  sessionsIncluded: number;
  amountKes: number;
  billing: string;
  phase: number;
  note: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  sessionsIncluded: number;
  renewalDate: string;
  status: string;
  createdAt: string;
}

export interface RevealGrant {
  id: string;
  clientId: string;
  providerId: string;
  bookingId: string | null;
  level: RevealLevel;
  firstName: string | null;
  fullName: string | null;
  photoUrl: string | null;
  active: boolean;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateRevealRequest {
  providerId: string;
  bookingId?: string;
  level: RevealLevel;
  firstName?: string;
  fullName?: string;
  photoUrl?: string;
}

export interface SupportGroup {
  id: string;
  topic: string;
  schedule: string;
  capacity: number;
  memberCount: number;
}

export interface SupportGroupMembership {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  group: {
    id: string;
    topic: string;
    schedule: string;
    capacity: number;
  };
}

export interface ResourceItem {
  id: string;
  type: ResourceType;
  title: string;
  body: string | null;
  url: string | null;
  tags: string[];
  published: boolean;
  createdAt: string;
}

export interface PendingVerification {
  id: string;
  pseudonymId: string;
  verifyingBody: string | null;
  expiryDate: string | null;
  createdAt: string;
}

export interface VerificationDetail extends PendingVerification {
  licenseNumber: string;
  documentRefs: unknown;
  decision: string;
}

export interface AuditLogEntry {
  id: string;
  actorPseudonym: string;
  action: string;
  target: string;
  metadata: unknown;
  timestamp: string;
}
