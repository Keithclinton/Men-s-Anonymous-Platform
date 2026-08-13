import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  ChargeOutcome,
  InitiateChargeParams,
  InitiateChargeResult,
  PaymentGateway,
  PayoutParams,
  PayoutResult,
} from './payment-gateway.interface';

interface StkPushCallbackItem {
  Name: string;
  Value?: string | number;
}

interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: StkPushCallbackItem[] };
    };
  };
}

/**
 * Safaricom Daraja integration. STK Push is async by nature (see ARCHITECTURE.md §11b):
 * initiateCharge only confirms the prompt was sent — the real result comes back via
 * handleCallback, or via queryStatus if the callback never arrives.
 */
@Injectable()
export class MpesaGateway implements PaymentGateway {
  private readonly logger = new Logger(MpesaGateway.name);

  // In-memory OAuth token cache. Fine for a single instance; move to Redis once you're
  // running more than one API replica so they're not all re-authenticating separately.
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get('MPESA_ENV') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const consumerKey = this.config.getOrThrow<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.config.getOrThrow<string>('MPESA_CONSUMER_SECRET');
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const { data } = await axios.get<{ access_token: string; expires_in: string }>(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    this.cachedToken = {
      value: data.access_token,
      // Refresh a minute early so we never fire a request on an about-to-expire token.
      expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
    };
    return this.cachedToken.value;
  }

  private buildPassword(shortcode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  }

  private timestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
  }

  async initiateCharge(params: InitiateChargeParams): Promise<InitiateChargeResult> {
    const token = await this.getAccessToken();
    const shortcode = this.config.getOrThrow<string>('MPESA_SHORTCODE');
    const passkey = this.config.getOrThrow<string>('MPESA_PASSKEY');
    const timestamp = this.timestamp();

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: this.buildPassword(shortcode, passkey, timestamp),
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(params.amount),
        PartyA: params.phone,
        PartyB: shortcode,
        PhoneNumber: params.phone,
        CallBackURL: this.config.getOrThrow<string>('MPESA_CALLBACK_URL'),
        AccountReference: params.accountReference,
        TransactionDesc: params.description,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    this.logger.log(`STK push sent for ${params.userId}: ${data.CheckoutRequestID}`);
    return { externalRef: data.CheckoutRequestID, status: 'PENDING' };
  }

  async handleCallback(rawBody: unknown): Promise<ChargeOutcome> {
    const body = rawBody as StkCallbackBody;
    const callback = body.Body.stkCallback;

    if (callback.ResultCode !== 0) {
      return {
        externalRef: callback.CheckoutRequestID,
        status: 'FAILED',
        failureReason: callback.ResultDesc,
      };
    }

    const items = callback.CallbackMetadata?.Item ?? [];
    const amount = items.find((i) => i.Name === 'Amount')?.Value;

    return {
      externalRef: callback.CheckoutRequestID,
      status: 'SUCCEEDED',
      amount: typeof amount === 'number' ? amount : undefined,
    };
  }

  async queryStatus(externalRef: string): Promise<'PENDING' | 'SUCCEEDED' | 'FAILED'> {
    const token = await this.getAccessToken();
    const shortcode = this.config.getOrThrow<string>('MPESA_SHORTCODE');
    const passkey = this.config.getOrThrow<string>('MPESA_PASSKEY');
    const timestamp = this.timestamp();

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: shortcode,
        Password: this.buildPassword(shortcode, passkey, timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: externalRef,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (data.ResultCode === undefined) return 'PENDING';
    return Number(data.ResultCode) === 0 ? 'SUCCEEDED' : 'FAILED';
  }

  async payout(_params: PayoutParams): Promise<PayoutResult> {
    // B2C (provider payouts) needs a SecurityCredential — PayoutParams' phone/amount
    // encrypted against Safaricom's public certificate, not our AES key — plus a
    // separate Safaricom approval for the B2C product. See ARCHITECTURE.md §11b.
    // Wiring this up for real is a Phase-1-adjacent task once that approval lands.
    throw new NotImplementedException(
      'M-Pesa B2C payouts require a certified SecurityCredential and Safaricom B2C approval — not wired up yet.',
    );
  }
}
