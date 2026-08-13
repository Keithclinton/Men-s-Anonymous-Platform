import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
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

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
