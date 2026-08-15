import { Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';

/** Content library (articles/videos), public or gated. See ARCHITECTURE.md §4, Phase 2. */
@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: CorePrismaService) {}

  async create(dto: CreateResourceDto) {
    return this.prisma.resourceLibraryItem.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        url: dto.url,
        tags: dto.tags ?? [],
        published: dto.published ?? false,
      },
    });
  }

  async listPublished(tag?: string) {
    return this.prisma.resourceLibraryItem.findMany({
      where: { published: true, ...(tag ? { tags: { has: tag } } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const item = await this.prisma.resourceLibraryItem.findUnique({ where: { id } });
    if (!item || !item.published) {
      throw new NotFoundException('Resource not found');
    }
    return item;
  }
}
