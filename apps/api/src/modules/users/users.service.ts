import { Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';

/** Pseudonymous profile records only — role, status, preferences. See ARCHITECTURE.md §4. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: CorePrismaService) {}

  async getById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        providerProfile: true,
        clientProfile: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
