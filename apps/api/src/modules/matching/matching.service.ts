import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Booking, ProviderKind } from '../../generated/prisma-core';
import { BookingService } from '../booking/booking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestMatchDto } from './dto/request-match.dto';

/** Accept/decline window before a queued request reassigns. See ARCHITECTURE.md §10b. */
const MATCH_EXPIRY_MS = 15 * 60_000;

/**
 * Auto-match / request-queue path from ARCHITECTURE.md §10b: a client asks for "someone
 * with X specialty" instead of picking a person, the least-loaded matching provider gets
 * assigned, and has a 15-minute window to accept or decline before it reassigns.
 *
 * No persistent worker process (this runs on Vercel serverless functions) — instead of a
 * delayed job per request, each REQUESTED booking carries its own `matchExpiresAt`, and
 * `sweepExpired()` is invoked on a schedule (Vercel Cron) to catch anything past it. See
 * modules/matching/matching.controller.ts for the cron-facing endpoint.
 *
 * Direct booking (client picks a published slot) doesn't go through here at all — see
 * modules/booking.
 */
@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly booking: BookingService,
    private readonly notifications: NotificationsService,
  ) {}

  async requestMatch(clientId: string, dto: RequestMatchDto) {
    const scheduledStart = new Date(dto.scheduledStart);
    if (scheduledStart.getTime() <= Date.now()) {
      throw new ConflictException('scheduledStart must be in the future');
    }

    const providerId = await this.pickLeastLoadedProvider(dto.specialty, [], dto.kind);
    if (!providerId) {
      throw new NotFoundException(`No providers currently available for "${dto.specialty}"`);
    }

    const booking = await this.booking.createMatchedRequest({
      clientId,
      providerId,
      scheduledStart,
      durationMin: dto.durationMin,
      channelType: dto.channelType,
      specialty: dto.specialty,
      kind: dto.kind,
      matchExpiresAt: new Date(Date.now() + MATCH_EXPIRY_MS),
    });

    await this.notifications.notifyNewSessionRequest(providerId);

    return booking;
  }

  async accept(bookingId: string, providerId: string) {
    const booking = await this.requireRequestedBookingForProvider(bookingId, providerId);
    return this.booking.confirm(booking.id);
  }

  async decline(bookingId: string, providerId: string) {
    const booking = await this.requireRequestedBookingForProvider(bookingId, providerId);
    return this.reassignOrCancel(booking);
  }

  /**
   * Cron-invoked (no per-booking timers without a persistent worker) — sweeps every
   * REQUESTED booking whose accept/decline window has passed. Safe to call as often as
   * you like; a booking not yet past its `matchExpiresAt` is left untouched.
   */
  async sweepExpired(): Promise<{ swept: number }> {
    const expired = await this.prisma.booking.findMany({
      where: { status: 'REQUESTED', matchExpiresAt: { lt: new Date() } },
    });
    for (const booking of expired) {
      await this.reassignOrCancel(booking);
    }
    return { swept: expired.length };
  }

  private async reassignOrCancel(booking: Booking): Promise<Booking> {
    if (!booking.specialty) {
      // Should be unreachable — only bookings created via requestMatch land here, and
      // those always carry a specialty. Fail loudly rather than silently no-op.
      throw new ConflictException('Booking has no specialty on record; cannot re-match it');
    }

    const excluded = [...booking.declinedProviderIds, booking.providerId];
    const next = await this.pickLeastLoadedProvider(booking.specialty, excluded, booking.kind ?? undefined);

    if (!next) {
      return this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', declinedProviderIds: excluded, matchExpiresAt: null },
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        providerId: next,
        declinedProviderIds: excluded,
        matchExpiresAt: new Date(Date.now() + MATCH_EXPIRY_MS),
      },
    });
    await this.notifications.notifyNewSessionRequest(next);
    return updated;
  }

  private async requireRequestedBookingForProvider(
    bookingId: string,
    providerId: string,
  ): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.providerId !== providerId) {
      throw new ForbiddenException('This request is not assigned to you');
    }
    if (booking.status !== 'REQUESTED') {
      throw new ConflictException('This request is no longer pending');
    }
    return booking;
  }

  private async pickLeastLoadedProvider(
    specialty: string,
    excludeIds: string[] = [],
    kind?: ProviderKind,
  ): Promise<string | null> {
    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        specialties: { has: specialty },
        userId: { notIn: excludeIds },
        ...(kind ? { kind } : {}),
      },
    });
    if (candidates.length === 0) {
      return null;
    }

    const loads = await Promise.all(
      candidates.map(async (candidate) => ({
        providerId: candidate.userId,
        load: await this.prisma.booking.count({
          where: { providerId: candidate.userId, status: { in: ['REQUESTED', 'CONFIRMED'] } },
        }),
      })),
    );
    loads.sort((a, b) => a.load - b.load);
    return loads[0].providerId;
  }
}
