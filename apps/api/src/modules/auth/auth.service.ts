import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly vault: IdentityVaultService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<TokenPair> {
    const role = dto.role ?? 'CLIENT';

    // PROVIDER accounts aren't anonymous — they sign in with their real email instead of a
    // handle, so the User row gets an opaque generated username nobody ever sees or types.
    // See ARCHITECTURE.md §3 and identity-vault.service.ts#findPseudonymByEmail.
    if (role === 'PROVIDER') {
      const existingPseudonym = await this.vault.findPseudonymByEmail(dto.email as string, {
        actorPseudonym: 'system',
        reason: 'signup_duplicate_check',
      });
      if (existingPseudonym) {
        throw new ConflictException('An account with that email already exists');
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const user = await this.prisma.user.create({
        data: { username: `provider_${randomUUID()}`, passwordHash, role },
      });

      await this.vault.createIdentity(
        { pseudonymId: user.id, email: dto.email, phone: dto.phone },
        { actorPseudonym: user.id, reason: 'signup' },
      );

      return this.issueTokens(user.id, user.role);
    }

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username as string },
    });
    if (existing) {
      throw new ConflictException('That username is taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username as string,
        passwordHash,
        role,
      },
    });

    // Recovery contact info is optional and lives ONLY in the vault, keyed by the
    // pseudonym we just minted — never on the User row itself. See ARCHITECTURE.md §3.
    if (dto.email || dto.phone) {
      await this.vault.createIdentity(
        { pseudonymId: user.id, email: dto.email, phone: dto.phone },
        { actorPseudonym: user.id, reason: 'signup' },
      );
    }

    return this.issueTokens(user.id, user.role);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = dto.email
      ? await this.findUserByEmail(dto.email)
      : await this.prisma.user.findUnique({ where: { username: dto.username as string } });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }
    return this.issueTokens(user.id, user.role);
  }

  private async findUserByEmail(email: string) {
    const pseudonymId = await this.vault.findPseudonymByEmail(email, {
      actorPseudonym: 'system',
      reason: 'login',
    });
    if (!pseudonymId) return null;
    return this.prisma.user.findUnique({ where: { id: pseudonymId } });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // TODO: rotate + blacklist the used refresh token (e.g. in Redis) once refresh-token
    // reuse detection matters — fine to defer past the initial scaffold.
    return this.issueTokens(user.id, user.role);
  }

  private async issueTokens(userId: string, role: string): Promise<TokenPair> {
    const payload = { sub: userId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL'),
        algorithm: 'HS256',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_TTL'),
        algorithm: 'HS256',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
