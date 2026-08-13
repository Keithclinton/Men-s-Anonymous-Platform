import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma-core';

/** App-core database: pseudonymous data only. See ARCHITECTURE.md §3. */
@Injectable()
export class CorePrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorePrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to core database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
