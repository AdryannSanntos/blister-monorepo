import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { ContextModule } from './context/context.module';
import { DesignSystemModule } from './design-system/design-system.module';
import { EmailModule } from './email';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PermissionGuard } from './organization/guards/permission.guard';
import { OrganizationModule } from './organization/organization.module';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'], isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmailModule,
    OrganizationModule,
    OnboardingModule,
    AssetsModule,
    ContextModule,
    DesignSystemModule,
    PlatformModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
