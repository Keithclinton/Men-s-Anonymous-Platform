import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Booking } from '../../generated/prisma-core';
import { BookingService } from '../booking/booking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestMatchDto } from './dto/request-match.dto';
import { MatchExpiryQueue } from './match-expiry.queue';

/**
 * Auto-match / request-queue path from ARCHITECTURE.md §10b: a client asks for "someone
 * with X specialty" instead of picking a person, the least-loaded matching provider gets
 * assigned, and has a 15-minute window to accept or decline before it reassigns.
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
    private readonly expiryQueue: MatchExpiryQueue,
  ) {}

  async requestMatch(clientId: string, dto: RequestMatchDto) {
    const scheduledStart = new Date(dto.scheduledStart);
    if (scheduledStart.getTime() <= Date.now()) {
      throw new ConflictException('scheduledStart must be in the future');
    }

    const providerId = await this.pickLeastLoadedProvider(dto.specialty);
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
    });

    await this.expiryQueue.schedule(booking.id);
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

  /** Called by apps/worker's match-expiry job — a no-op if the request was already resolved. */
  async expireIfStillRequested(bookingId: string): Promise<{ reassigned: boolean }> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== 'REQUESTED') {
      return { reassigned: false };
    }
    await this.reassignOrCancel(booking);
    return { reassigned: true };
  }

  private async reassignOrCancel(booking: Booking): Promise<Booking> {
    if (!booking.specialty) {
      // Should be unreachable — only bookings created via requestMatch land here, and
      // those always carry a specialty. Fail loudly rather than silently no-op.
      throw new ConflictException('Booking has no specialty on record; cannot re-match it');
    }

    const excluded = [...booking.declinedProviderIds, booking.providerId];
    const next = await this.pickLeastLoadedProvider(booking.specialty, excluded);

    if (!next) {
      return this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', declinedProviderIds: excluded },
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { providerId: next, declinedProviderIds: excluded },
    });
    await this.expiryQueue.schedule(updated.id);
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
  ): Promise<string | null> {
    const candidates = await this.prisma.providerProfile.findMany({
      where: { specialties: { has: specialty }, userId: { notIn: excludeIds } },
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
