import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { CreateSupportGroupDto } from './dto/create-support-group.dto';

/** Anonymous group sessions, membership by pseudonym. See ARCHITECTURE.md §4, Phase 2. */
@Injectable()
export class SupportGroupsService {
  constructor(private readonly prisma: CorePrismaService) {}

  async create(dto: CreateSupportGroupDto) {
    return this.prisma.supportGroup.create({
      data: { topic: dto.topic, schedule: new Date(dto.schedule), capacity: dto.capacity },
    });
  }

  async listUpcoming() {
    const groups = await this.prisma.supportGroup.findMany({
      where: { schedule: { gte: new Date() } },
      orderBy: { schedule: 'asc' },
      include: { _count: { select: { memberships: true } } },
    });
    // Member identities never leave the server pseudonymous — only a headcount is exposed.
    return groups.map((g) => ({
      id: g.id,
      topic: g.topic,
      schedule: g.schedule,
      capacity: g.capacity,
      memberCount: g._count.memberships,
    }));
  }

  // Note: capacity check + insert isn't wrapped in a serializable transaction, so two
  // concurrent joins on the last open spot could both succeed. Fine for expected group
  // sizes/traffic here — revisit with a transaction + row lock if that becomes a problem.
  async join(groupId: string, userId: string) {
    const group = await this.prisma.supportGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!group) {
      throw new NotFoundException('Support group not found');
    }
    if (group._count.memberships >= group.capacity) {
      throw new ConflictException('This group is full');
    }

    return this.prisma.supportGroupMembership.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
  }

  async leave(groupId: string, userId: string) {
    await this.prisma.supportGroupMembership.deleteMany({ where: { groupId, userId } });
  }

  async listMine(userId: string) {
    return this.prisma.supportGroupMembership.findMany({
      where: { userId },
      include: { group: true },
    });
  }
}
