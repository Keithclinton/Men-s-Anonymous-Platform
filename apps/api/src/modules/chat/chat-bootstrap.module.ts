import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from '../../common/config/env.validation';
import { CorePrismaModule } from '../../common/prisma/core-prisma.module';
import { ChatGateway } from './chat.gateway';

/**
 * Standalone application context for api/socket.ts — deliberately NOT the main AppModule.
 * Nest auto-attaches a WebSocket adapter to any HTTP app instance containing a
 * @WebSocketGateway() provider once init()/listen() runs, which would otherwise put an
 * unauthenticated default socket.io listener on the REST API's own function (api/index.ts).
 * Only what chat actually needs: config validation, the core DB, and JwtService to verify
 * access tokens the same way the REST API does.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), CorePrismaModule, JwtModule.register({})],
  providers: [ChatGateway],
})
export class ChatBootstrapModule {}
