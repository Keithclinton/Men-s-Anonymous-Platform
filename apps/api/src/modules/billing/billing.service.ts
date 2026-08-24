import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { PAYMENT_GATEWAY, PaymentGateway } from './gateways/payment-gateway.interface';

export interface ChargeForBookingParams {
  userId: string;
  phone: string;
  amount: number;
  bookingId: string;
}

interface RateCard {
  minimumRate: number;
  hourlyRate: number;
}

export interface SubscriptionPlanDef {
  plan: 'starter' | 'standard';
  label: string;
  sessionsIncluded: number;
  amountKes: number;
  billing: string;
  phase: number;
  note: string;
}

/**
 * Phase 2 scaffold (ARCHITECTURE.md §11c) — no native recurring billing, so "subscribing"
 * just sends one STK push per cycle and the client re-subscribes manually. Real auto-renew
 * is deferred to Pesapal/cards per that section.
 */
const SUBSCRIPTION_PLANS: SubscriptionPlanDef[] = [
  {
    plan: 'starter',
    label: 'Starter',
    sessionsIncluded: 2,
    amountKes: 2000,
    billing: 'monthly',
    phase: 2,
    note: 'Phase 2 scaffold — manual monthly STK push, not true auto-renew.',
  },
  {
    plan: 'standard',
    label: 'Standard',
    sessionsIncluded: 4,
    amountKes: 3500,
    billing: 'monthly',
    phase: 2,
    note: 'Phase 2 scaffold — manual monthly STK push, not true auto-renew.',
  },
];

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: CorePrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async chargeForBooking(params: ChargeForBookingParams) {
    const result = await this.gateway.initiateCharge({
      userId: params.userId,
      phone: params.phone,
      amount: params.amount,
      accountReference: params.bookingId,
      description: 'Session payment',
    });

    // Real gateways start PENDING and stay that way until the callback (or the
    // reconciliation job, see reconcilePending below) resolves it — never assume success
    // from this call alone. MockGateway (PAYMENTS_MODE=mock) is the one exception: it
    // resolves SUCCEEDED immediately so booking flows can be tested without Safaricom creds.
    await this.prisma.payment.create({
      data: {
        userId: params.userId,
        bookingId: params.bookingId,
        provider: 'MPESA',
        externalRef: result.externalRef,
        amount: params.amount,
        status: result.status,
        direction: 'CHARGE',
      },
    });

    return result;
  }

  /**
   * Client-facing entry point: resolves the amount from the provider's rate card and the
   * booking's billingType/duration, then kicks off the M-Pesa STK Push. See
   * ARCHITECTURE.md §11 for why this is push-based/async rather than a synchronous charge.
   */
  async payForBooking(clientId: string, bookingId: string, phone: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: { include: { providerProfile: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('Not your booking');
    }

    const rateCard = booking.provider.providerProfile?.rateCard as RateCard | null | undefined;
    if (!rateCard) {
      throw new ConflictException('This provider has not set a rate card yet');
    }

    const amount =
      booking.billingType === 'MINIMUM'
        ? rateCard.minimumRate
        : Math.ceil((rateCard.hourlyRate * booking.durationMin) / 60);

    return this.chargeForBooking({ userId: clientId, phone, amount, bookingId });
  }

  /**
   * STK Push is async (§11b) — the frontend has no other way to know a charge resolved
   * short of this poll. Cheap to call every few seconds while a payment is PENDING.
   */
  async getPaymentStatus(bookingId: string, clientId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('Not your booking');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, direction: 'CHARGE' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: payment?.status ?? 'NOT_INITIATED',
      amount: payment?.amount ?? null,
      externalRef: payment?.externalRef ?? null,
    };
  }

  async handleProviderCallback(rawBody: unknown): Promise<void> {
    const outcome = await this.gateway.handleCallback(rawBody);

    const payment = await this.prisma.payment.findUnique({
      where: { externalRef: outcome.externalRef },
    });
    if (!payment) {
      this.logger.warn(`Callback for unknown payment ref ${outcome.externalRef}`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: outcome.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED' },
    });
  }

  /**
   * Sweeps payments stuck PENDING past a grace period and asks the gateway directly.
   * Callbacks occasionally never arrive — see ARCHITECTURE.md §11b. Meant to be invoked
   * on a schedule (Vercel Cron — see vercel.json), not from request handlers.
   */
  async reconcilePending(olderThanMinutes = 5): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const stuck = await this.prisma.payment.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
    });

    let resolved = 0;
    for (const payment of stuck) {
      const status = await this.gateway.queryStatus(payment.externalRef);
      if (status === 'PENDING') continue;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED' },
      });
      resolved += 1;
    }
    return resolved;
  }

  /**
   * Aggregate view for a provider's own earnings tab — gross of everything a client has
   * ever successfully paid for their bookings, minus what's already been paid out or is
   * mid-payout. Computed on read rather than maintained as a running balance; fine at this
   * scale, and avoids a second source of truth to keep in sync with Payment.
   */
  async getProviderEarnings(providerId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { providerId },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);

    const charges = await this.prisma.payment.findMany({
      where: { bookingId: { in: bookingIds }, direction: 'CHARGE', status: 'SUCCEEDED' },
      orderBy: { createdAt: 'desc' },
    });
    const payouts = await this.prisma.payment.findMany({
      where: { userId: providerId, direction: 'PAYOUT' },
      orderBy: { createdAt: 'desc' },
    });

    const grossSucceeded = charges.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidOut = payouts
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingPayout = payouts
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      currency: 'KES',
      grossSucceeded,
      paidOut,
      pendingPayout,
      available: grossSucceeded - paidOut - pendingPayout,
      recentCharges: charges.slice(0, 10).map((c) => ({
        amount: c.amount,
        createdAt: c.createdAt,
        bookingId: c.bookingId,
        externalRef: c.externalRef,
      })),
      recentPayouts: payouts.slice(0, 10).map((p) => ({
        amount: p.amount,
        createdAt: p.createdAt,
        status: p.status,
        externalRef: p.externalRef,
      })),
    };
  }

  /**
   * Real M-Pesa payouts need a Daraja B2C product + SecurityCredential Safaricom hasn't
   * approved yet (see MpesaGateway#payout) — this throws NotImplementedException there,
   * same as before. Wiring the request/balance logic now so the rest of the flow (earnings,
   * the payout record, the provider desk UI) is ready the moment that approval lands.
   */
  async requestProviderPayout(providerId: string, dto: RequestPayoutDto) {
    const earnings = await this.getProviderEarnings(providerId);
    const amount = dto.amount ?? earnings.available;
    if (amount <= 0) {
      throw new ConflictException('No available balance to pay out');
    }
    if (amount > earnings.available) {
      throw new BadRequestException('Amount exceeds available balance');
    }

    const result = await this.gateway.payout({
      providerId,
      phone: dto.phone,
      amount,
      reason: dto.reason ?? 'Provider payout',
    });

    await this.prisma.payment.create({
      data: {
        userId: providerId,
        bookingId: null,
        provider: 'MPESA',
        externalRef: result.externalRef,
        amount,
        status: result.status,
        direction: 'PAYOUT',
      },
    });

    return result;
  }

  listPlans(): SubscriptionPlanDef[] {
    return SUBSCRIPTION_PLANS;
  }

  async listMySubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Optimistic by design (see SUBSCRIPTION_PLANS comment): the subscription activates
   * immediately rather than waiting on the STK push callback. SubscriptionStatus has no
   * PENDING state — building real activate-on-callback plumbing isn't worth it for a
   * documented Phase 2 scaffold. The underlying Payment record still tracks the real
   * gateway outcome for reconciliation.
   */
  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    const planDef = SUBSCRIPTION_PLANS.find((p) => p.plan === dto.plan);
    if (!planDef) {
      throw new NotFoundException('Unknown plan');
    }

    const chargeResult = await this.gateway.initiateCharge({
      userId,
      phone: dto.phone,
      amount: planDef.amountKes,
      accountReference: `subscription-${dto.plan}`,
      description: `${planDef.label} subscription`,
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        plan: dto.plan,
        sessionsIncluded: planDef.sessionsIncluded,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60_000),
        status: 'ACTIVE',
      },
    });

    await this.prisma.payment.create({
      data: {
        userId,
        bookingId: null,
        provider: 'MPESA',
        externalRef: chargeResult.externalRef,
        amount: planDef.amountKes,
        status: chargeResult.status,
        direction: 'CHARGE',
      },
    });

    return {
      subscription,
      payment: { externalRef: chargeResult.externalRef, status: chargeResult.status },
    };
  }
}
