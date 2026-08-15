import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createNestApp } from './create-app';

async function bootstrap() {
  const app = await createNestApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
