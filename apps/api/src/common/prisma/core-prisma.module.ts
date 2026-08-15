import { Global, Module } from '@nestjs/common';
import { CorePrismaService } from './core-prisma.service';

@Global()
@Module({
  providers: [CorePrismaService],
  exports: [CorePrismaService],
})
export class CorePrismaModule {}
