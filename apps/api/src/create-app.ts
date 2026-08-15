import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Shared between apps/api/src/main.ts (local dev / traditional server) and api/index.ts
 * (the Vercel serverless entry point) so the two never drift — everything except how the
 * resulting app is actually served (`.listen()` vs. handed to a request handler) lives here.
 */
export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);

  // CORS_ORIGIN unset -> reflect the request origin, which is convenient for local dev
  // against any frontend port. In production that same default would allow browser
  // requests from anywhere, so there it falls back to allowing nothing instead — set
  // CORS_ORIGIN explicitly before deploying.
  const corsOrigin = config.get<string>('CORS_ORIGIN');
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : !isProduction,
    credentials: true,
  });

  return app;
}
