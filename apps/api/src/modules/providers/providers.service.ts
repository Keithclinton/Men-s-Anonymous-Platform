import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { Prisma } from '../../generated/prisma-core';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
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

  async listBySpecialty(specialty?: string) {
    return this.prisma.providerProfile.findMany({
      where: specialty ? { specialties: { has: specialty } } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }
}
