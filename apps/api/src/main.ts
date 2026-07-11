import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { registerBetterAuth } from './auth/register-better-auth';
import { resolveNestLogLevels } from './common/nest-log-levels';
import { PrismaService } from './prisma/prisma.service';

/** Carousel ai-edit/render requests include full slide HTML+CSS and can exceed 100kb. */
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT ?? '5mb';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: resolveNestLogLevels(),
  });
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(urlencoded({ limit: JSON_BODY_LIMIT, extended: true }));
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  await registerBetterAuth(app, app.get(PrismaService));
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}`, 'Bootstrap');
}
void bootstrap();
