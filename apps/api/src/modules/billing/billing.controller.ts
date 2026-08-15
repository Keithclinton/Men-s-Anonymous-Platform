import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalSecretGuard } from '../../common/guards/internal-secret.guard';
import { Role } from '../../generated/prisma-core';
import { BillingService } from './billing.service';
import { PayForBookingDto } from './dto/pay-for-booking.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /**
   * Client-initiated — sends the STK Push prompt to their phone. See ARCHITECTURE.md §11.
   * Throttled tighter than default: each call interrupts someone's phone with a real
   * prompt, so this isn't just about server load.
   */
  @Roles(Role.CLIENT)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('bookings/:bookingId/pay')
  payForBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: PayForBookingDto,
  ) {
    return this.billing.payForBooking(user.userId, bookingId, dto.phone);
  }

  /** Poll this while status is PENDING — see ARCHITECTURE.md §11b. */
  @Roles(Role.CLIENT)
  @Get('bookings/:bookingId/payment-status')
  getPaymentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.billing.getPaymentStatus(bookingId, user.userId);
  }

  /**
   * Safaricom calls this directly with the STK Push result — no JWT, and it must be a
   * publicly reachable HTTPS endpoint even in sandbox/dev. See ARCHITECTURE.md §11b.
   */
  @Public()
  @Post('mpesa/callback')
  async mpesaCallback(@Body() body: unknown) {
    await this.billing.handleProviderCallback(body);
    // Daraja expects exactly this 200 shape, or it will keep retrying the callback.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  /**
   * Cron-invoked (Vercel Cron — see vercel.json), not by user traffic — sweeps payments
   * stuck PENDING past the grace period. See ARCHITECTURE.md §11b. GET because that's all
   * Vercel Cron can invoke; see InternalSecretGuard for how it's authenticated.
   */
  @Public()
  @UseGuards(InternalSecretGuard)
  @Get('internal/reconcile')
  async reconcile() {
    const resolved = await this.billing.reconcilePending();
    return { resolved };
  }
}
