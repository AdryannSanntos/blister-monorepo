import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { registerBetterAuth } from './auth/register-better-auth';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  await registerBetterAuth(app, app.get(PrismaService));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
