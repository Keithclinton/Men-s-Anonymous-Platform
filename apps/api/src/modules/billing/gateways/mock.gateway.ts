import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  ChargeOutcome,
  InitiateChargeParams,
  InitiateChargeResult,
  PaymentGateway,
  PayoutParams,
  PayoutResult,
} from './payment-gateway.interface';

/**
 * PAYMENTS_MODE=mock — stands in for MpesaGateway so booking can be exercised end to end
 * without real Safaricom Daraja credentials. Never bind this when PAYMENTS_MODE is unset
 * or "live"; see billing.module.ts.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    const externalRef = `mock_${randomUUID()}`;
    this.logger.warn(
      `[PAYMENTS_MODE=mock] Auto-succeeding charge ${externalRef} for booking ${params.accountReference} — no real payment was collected.`,
    );
    return { externalRef, status: 'SUCCEEDED' };
  }

  async handleCallback(rawBody: unknown): Promise<ChargeOutcome> {
    const body = rawBody as { externalRef?: string; status?: 'SUCCEEDED' | 'FAILED' };
    return {
      externalRef: body.externalRef ?? `mock_${randomUUID()}`,
      status: body.status ?? 'SUCCEEDED',
    };
  }

  async queryStatus(_externalRef: string): Promise<'PENDING' | 'SUCCEEDED' | 'FAILED'> {
    // Nothing is ever left PENDING by this gateway, so reconciliation has nothing to do.
    return 'SUCCEEDED';
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    const externalRef = `mock_payout_${randomUUID()}`;
    this.logger.warn(
      `[PAYMENTS_MODE=mock] Auto-succeeding payout ${externalRef} to provider ${params.providerId} — no real payout was sent.`,
    );
    return { externalRef, status: 'PENDING' };
  }
}
