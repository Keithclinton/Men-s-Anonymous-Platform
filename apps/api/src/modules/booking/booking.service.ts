import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Booking, BookingStatus, Prisma } from '../../generated/prisma-core';
import { CreateBookingDto } from './dto/create-booking.dto';

const MINIMUM_BILLING_CUTOFF_MIN = 30;
/** How far around a candidate slot we bother scanning for conflicts — generous for short sessions. */
const CONFLICT_SCAN_WINDOW_MS = 4 * 60 * 60_000;

/**
 * Scheduling, session lifecycle: requested -> confirmed -> completed/cancelled.
 * This module handles direct booking (client picks a provider's open slot and it
 * auto-confirms) — see ARCHITECTURE.md §10b. The auto-match/request-queue path lives in
 * modules/matching and calls back into here for the actual row.
 */
@Injectable()
export class BookingService {
  constructor(private readonly prisma: CorePrismaService) {}

  async createDirectBooking(clientId: string, dto: CreateBookingDto) {
    const provider = await this.prisma.user.findUnique({
      where: { id: dto.providerId },
      include: { providerProfile: true },
    });
    if (!provider || provider.role !== 'PROVIDER' || !provider.providerProfile) {
      throw new NotFoundException('Provider not found, or has not published a profile yet');
    }

    const scheduledStart = new Date(dto.scheduledStart);
    if (scheduledStart.getTime() <= Date.now()) {
      throw new ConflictException('scheduledStart must be in the future');
    }

    await this.assertNoConflict(dto.providerId, scheduledStart, dto.durationMin);

    return this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        scheduledStart,
        durationMin: dto.durationMin,
        billingType: dto.durationMin <= MINIMUM_BILLING_CUTOFF_MIN ? 'MINIMUM' : 'HOURLY',
        status: 'CONFIRMED',
        session: { create: { channelType: dto.channelType } },
      },
      include: { session: true },
    });
  }

  /**
   * Used by modules/matching once a provider accepts a queued request — same row shape,
   * just created REQUESTED (already assigned to a provider) instead of CONFIRMED.
   */
  async createMatchedRequest(params: {
    clientId: string;
    providerId: string;
    scheduledStart: Date;
    durationMin: number;
    channelType: 'CHAT' | 'VIDEO';
    specialty: string;
    matchExpiresAt: Date;
  }) {
    return this.prisma.booking.create({
      data: {
        clientId: params.clientId,
        providerId: params.providerId,
        scheduledStart: params.scheduledStart,
        durationMin: params.durationMin,
        billingType: params.durationMin <= MINIMUM_BILLING_CUTOFF_MIN ? 'MINIMUM' : 'HOURLY',
        status: 'REQUESTED',
        specialty: params.specialty,
        matchExpiresAt: params.matchExpiresAt,
        session: { create: { channelType: params.channelType } },
      },
      include: { session: true },
    });
  }

  async confirm(bookingId: string): Promise<Booking> {
    // matchExpiresAt is a no-op to clear on a direct booking (never set), and required to
    // clear on a matched one (accepted — no longer subject to the auto-match sweep).
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', matchExpiresAt: null },
    });
  }

  async markCompleted(bookingId: string): Promise<Booking> {
    return this.setStatus(bookingId, 'COMPLETED');
  }

  async cancel(bookingId: string, actorId: string): Promise<Booking> {
    const booking = await this.requireParticipant(bookingId, actorId);
    if (booking.status === 'COMPLETED') {
      throw new ConflictException('A completed session cannot be cancelled');
    }
    return this.setStatus(bookingId, 'CANCELLED');
  }

  async getById(bookingId: string, actorId: string) {
    return this.requireParticipant(bookingId, actorId, { session: true });
  }

  async listMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { OR: [{ clientId: userId }, { providerId: userId }] },
      orderBy: { scheduledStart: 'desc' },
      include: { session: true },
    });
  }

  private async setStatus(bookingId: string, status: BookingStatus): Promise<Booking> {
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status } });
  }

  private async requireParticipant(
    bookingId: string,
    actorId: string,
    include?: Prisma.BookingInclude,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== actorId && booking.providerId !== actorId) {
      throw new ForbiddenException('Not a participant in this booking');
    }
    return booking;
  }

  private async assertNoConflict(
    providerId: string,
    scheduledStart: Date,
    durationMin: number,
  ): Promise<void> {
    const newEnd = new Date(scheduledStart.getTime() + durationMin * 60_000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        providerId,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
        scheduledStart: {
          gte: new Date(scheduledStart.getTime() - CONFLICT_SCAN_WINDOW_MS),
          lt: newEnd,
        },
      },
    });

    const overlaps = candidates.some((existing) => {
      const existingEnd = new Date(existing.scheduledStart.getTime() + existing.durationMin * 60_000);
      return scheduledStart < existingEnd && existing.scheduledStart < newEnd;
    });

    if (overlaps) {
      throw new ConflictException('That provider already has a session booked in this window');
    }
  }
}
