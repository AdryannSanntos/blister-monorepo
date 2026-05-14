import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email';
import { OnboardingModule } from './onboarding/onboarding.module';
import { OrganizationModule } from './organization/organization.module';
import { PermissionGuard } from './organization/guards/permission.guard';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'], isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmailModule,
    OrganizationModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
