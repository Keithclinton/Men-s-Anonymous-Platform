import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
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

    // Starts PENDING and stays that way until the callback (or the reconciliation job,
    // see reconcilePending below) resolves it. Never assume success from this call alone.
    await this.prisma.payment.create({
      data: {
        userId: params.userId,
        bookingId: params.bookingId,
        provider: 'MPESA',
        externalRef: result.externalRef,
        amount: params.amount,
        status: 'PENDING',
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
}
