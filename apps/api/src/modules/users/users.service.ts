import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import { CreateRevealGrantDto } from './dto/create-reveal-grant.dto';
import { UpsertClientProfileDto } from './dto/upsert-client-profile.dto';

/** Pseudonymous profile records + scoped reveal grants. See ARCHITECTURE.md §4 / product-rules §2. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly audit: AuditService,
    private readonly vault: IdentityVaultService,
    private readonly encryption: EncryptionService,
  ) {}

  async getById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        staffRole: true,
        status: true,
        createdAt: true,
        providerProfile: true,
        clientProfile: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // clientProfile.intakeNotes is stored encrypted (see upsertMyProfile below) — only ever
    // decrypted back out for the owning client reading their own record, same as the
    // PROVIDER email case below.
    const clientProfile = this.shapeClientProfile(user.clientProfile);

    // PROVIDER accounts sign in with email, not a handle (see auth.service.ts#signup) — the
    // generated `username` is opaque, so surface the real email for the frontend to display
    // instead. Only ever this user reading their own record, so a vault read is fine here.
    if (user.role === 'PROVIDER') {
      const { email } = await this.vault.getContact(userId, {
        actorPseudonym: userId,
        reason: 'read_own_profile',
      });
      return { ...user, clientProfile, email };
    }

    return { ...user, clientProfile, email: null as string | null };
  }

  /** CLIENT self-service — preferences feed auto-match, intake notes are for the provider they book. */
  async upsertMyProfile(userId: string, dto: UpsertClientProfileDto) {
    const preferences = {
      specialties: dto.specialties ?? [],
      preferredChannel: dto.preferredChannel ?? null,
    };
    const encryptedNotes = this.encryption.encryptOrNull(dto.intakeNotes);

    const profile = await this.prisma.clientProfile.upsert({
      where: { userId },
      create: { userId, preferences, intakeNotes: encryptedNotes },
      update: { preferences, intakeNotes: encryptedNotes },
    });

    return this.shapeClientProfile(profile);
  }

  /** Flattens the stored `preferences` JSON blob and decrypts intakeNotes for API responses. */
  private shapeClientProfile(
    row: {
      userId: string;
      preferences: unknown;
      intakeNotes: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null,
  ) {
    if (!row) return null;
    const preferences = (row.preferences ?? {}) as {
      specialties?: string[];
      preferredChannel?: 'CHAT' | 'VIDEO' | null;
    };
    return {
      userId: row.userId,
      specialties: preferences.specialties ?? [],
      preferredChannel: preferences.preferredChannel ?? null,
      intakeNotes: this.encryption.decryptOrNull(row.intakeNotes),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listMyReveals(clientId: string) {
    return this.prisma.identityRevealGrant.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRevealsForProvider(providerId: string) {
    return this.prisma.identityRevealGrant.findMany({
      where: { providerId, active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        providerId: true,
        bookingId: true,
        level: true,
        firstName: true,
        fullName: true,
        photoUrl: true,
        active: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  }

  async createReveal(clientId: string, dto: CreateRevealGrantDto) {
    const provider = await this.prisma.user.findUnique({ where: { id: dto.providerId } });
    if (!provider || provider.role !== 'PROVIDER') {
      throw new NotFoundException('Provider not found');
    }

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.clientId !== clientId) {
        throw new ForbiddenException('Not your booking');
      }
      if (booking.providerId !== dto.providerId) {
        throw new BadRequestException('providerId must match the booking’s provider');
      }
    }

    this.assertProjection(dto);

    // Revoke any prior active grant for the same client+provider(+booking) scope first —
    // product rule: higher levels replace; revoke is for future sessions.
    await this.prisma.identityRevealGrant.updateMany({
      where: {
        clientId,
        providerId: dto.providerId,
        bookingId: dto.bookingId ?? null,
        active: true,
      },
      data: { active: false, revokedAt: new Date() },
    });

    const grant = await this.prisma.identityRevealGrant.create({
      data: {
        clientId,
        providerId: dto.providerId,
        bookingId: dto.bookingId,
        level: dto.level,
        firstName: dto.firstName,
        fullName: dto.fullName,
        photoUrl: dto.photoUrl,
      },
    });

    await this.audit.record({
      actorPseudonym: clientId,
      action: 'REVEAL_GRANT',
      target: dto.providerId,
      metadata: { grantId: grant.id, level: dto.level, bookingId: dto.bookingId ?? null },
    });

    return grant;
  }

  async revokeReveal(clientId: string, grantId: string) {
    const grant = await this.prisma.identityRevealGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw new NotFoundException('Reveal grant not found');
    if (grant.clientId !== clientId) throw new ForbiddenException('Not your reveal grant');
    if (!grant.active) return grant;

    const updated = await this.prisma.identityRevealGrant.update({
      where: { id: grantId },
      data: { active: false, revokedAt: new Date(), level: 'ANONYMOUS' },
    });

    await this.audit.record({
      actorPseudonym: clientId,
      action: 'REVEAL_REVOKE',
      target: grant.providerId,
      metadata: { grantId, bookingId: grant.bookingId },
    });

    return updated;
  }

  private assertProjection(dto: CreateRevealGrantDto) {
    if (dto.level === 'ANONYMOUS') return;
    if ((dto.level === 'FIRST_NAME' || dto.level === 'FULL_NAME' || dto.level === 'NAME_PHOTO') && !dto.firstName) {
      throw new BadRequestException('firstName is required for this reveal level');
    }
    if ((dto.level === 'FULL_NAME' || dto.level === 'NAME_PHOTO') && !dto.fullName) {
      throw new BadRequestException('fullName is required for this reveal level');
    }
    if (dto.level === 'NAME_PHOTO' && !dto.photoUrl) {
      throw new BadRequestException('photoUrl is required for NAME_PHOTO');
    }
  }
}
