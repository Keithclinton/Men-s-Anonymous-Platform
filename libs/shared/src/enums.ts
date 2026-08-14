export enum UserRole {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  MODERATOR = 'MODERATOR',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export enum BookingStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum SessionChannelType {
  CHAT = 'CHAT',
  VIDEO = 'VIDEO',
}

export enum PaymentProvider {
  MPESA = 'MPESA',
  PESAPAL = 'PESAPAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentDirection {
  CHARGE = 'CHARGE',
  PAYOUT = 'PAYOUT',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  GRACE = 'GRACE',
  LAPSED = 'LAPSED',
  CANCELLED = 'CANCELLED',
}

export enum ProviderVerificationStatus {
  PENDING = 'PENDING',
  NEEDS_INFO = 'NEEDS_INFO',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
