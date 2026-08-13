/**
 * Common shape both MpesaGateway (now) and a future PesapalGateway implement, so nothing
 * in booking/billing/refund logic needs to know which rail is behind a payment.
 * See ARCHITECTURE.md §11a.
 */

export interface InitiateChargeParams {
  /** pseudonym_id — never a real name. */
  userId: string;
  /** E.164 phone number, resolved by the caller from the identity vault just-in-time. */
  phone: string;
  amount: number;
  /** Usually a bookingId — what the customer will see as the payment reference. */
  accountReference: string;
  description: string;
}

export interface InitiateChargeResult {
  /** M-Pesa CheckoutRequestID / Pesapal OrderTrackingId — the idempotency key downstream. */
  externalRef: string;
  status: 'PENDING';
}

export interface PayoutParams {
  providerId: string;
  phone: string;
  amount: number;
  reason: string;
}

export interface PayoutResult {
  externalRef: string;
  status: 'PENDING';
}

export type ChargeOutcomeStatus = 'SUCCEEDED' | 'FAILED';

export interface ChargeOutcome {
  externalRef: string;
  status: ChargeOutcomeStatus;
  amount?: number;
  failureReason?: string;
}

export interface PaymentGateway {
  /** Starts an async charge (e.g. STK Push). Resolves once the prompt is sent, not once it's paid. */
  initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult>;

  /** Parses a provider webhook payload into a normalized outcome. */
  handleCallback(rawBody: unknown): Promise<ChargeOutcome>;

  /** Reconciliation path for callbacks that never arrive — see ARCHITECTURE.md §11b. */
  queryStatus(externalRef: string): Promise<'PENDING' | ChargeOutcomeStatus>;

  payout(params: PayoutParams): Promise<PayoutResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
