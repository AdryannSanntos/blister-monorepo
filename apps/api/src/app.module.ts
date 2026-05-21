import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AgentsModule } from './agents/agents.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AICatalogModule } from './ai-catalog/ai-catalog.module';
import { AIRuntimeModule } from './ai-runtime/ai-runtime.module';
import { AuditModule } from './audit/audit.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { CreditsModule } from './credits/credits.module';
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
    CreditsModule,
    ContextModule,
    DesignSystemModule,
    PlatformModule,
    AuditModule,
    AICatalogModule,
    AIRuntimeModule,
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
