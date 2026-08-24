import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Prisma, ProviderKind } from '../../generated/prisma-core';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

/**
 * Provider profiles, specialties, availability, verification status — the verification
 * *result* only; documents/license numbers stay in the vault (modules/identity-vault).
 * See ARCHITECTURE.md §4 and §10a.
 */
@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly vault: IdentityVaultService,
  ) {}

  /** Onboarding step 2 — see ARCHITECTURE.md §10a. */
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    return this.vault.submitProviderVerification(
      {
        pseudonymId: userId,
        licenseNumber: dto.licenseNumber,
        documentRefs: (dto.documentRefs ?? {}) as Prisma.InputJsonValue,
        verifyingBody: dto.verifyingBody,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
      { actorPseudonym: userId, reason: 'provider_verification_submission' },
    );
  }

  /** Onboarding step 4 — only reachable once a compliance officer has approved §10a step 3. */
  async publishProfile(userId: string, dto: UpsertProfileDto) {
    const verified = await this.vault.isVerified(userId, {
      actorPseudonym: userId,
      reason: 'publish_provider_profile',
    });
    if (!verified) {
      throw new ForbiddenException(
        'Your credentials have not been verified yet. Submit verification (POST /providers/me/verification) and wait for admin approval before publishing a profile.',
      );
    }

    const data = {
      displayName: dto.displayName,
      bio: dto.bio,
      kind: dto.kind as ProviderKind,
      specialties: dto.specialties,
      rateCard: dto.rateCard as unknown as Prisma.InputJsonValue,
      availability: dto.availability as Prisma.InputJsonValue | undefined,
    };

    return this.prisma.providerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async updateAvailability(userId: string, availability: Record<string, unknown>) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Publish a profile before setting availability');
    }
    return this.prisma.providerProfile.update({
      where: { userId },
      data: { availability: availability as Prisma.InputJsonValue },
    });
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }
    return profile;
  }

  async listBySpecialty(specialty?: string, kind?: ProviderKind) {
    return this.prisma.providerProfile.findMany({
      where: {
        ...(specialty ? { specialties: { has: specialty } } : {}),
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Public — a client picking a time before booking (BookPage). Only ever unbooked slots. */
  async listOpenSlots(providerId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: { providerId, bookingId: null, start: { gt: new Date() } },
      orderBy: { start: 'asc' },
    });
  }

  /** The provider's own calendar tab — open and booked, so they can see what's claimed. */
  async listMySlots(providerId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: { providerId },
      orderBy: { start: 'asc' },
    });
  }

  async createSlot(providerId: string, dto: CreateSlotDto) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId: providerId } });
    if (!profile) {
      throw new ForbiddenException('Publish a profile before adding open slots');
    }
    const start = new Date(dto.start);
    if (start.getTime() <= Date.now()) {
      throw new ConflictException('start must be in the future');
    }
    return this.prisma.availabilitySlot.create({
      data: { providerId, start, durationMin: dto.durationMin },
    });
  }

  async deleteSlot(providerId: string, slotId: string) {
    const slot = await this.prisma.availabilitySlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.providerId !== providerId) {
      throw new NotFoundException('Slot not found');
    }
    if (slot.bookingId) {
      throw new ConflictException('That slot is already booked — cancel the booking instead');
    }
    await this.prisma.availabilitySlot.delete({ where: { id: slotId } });
    return { deleted: true };
  }
}
