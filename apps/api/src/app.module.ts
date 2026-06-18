import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AiCatalogModule } from './ai-catalog/ai-catalog.module';
import { AiRuntimeModule } from './ai-runtime/ai-runtime.module';
import { AgentsModule } from './agents/agents.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { CreditsModule } from './credits/credits.module';
import { EmailModule } from './email';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { PersonalSpaceModule } from './personal-space/personal-space.module';
import { WorkspaceSettingsModule } from './workspace-settings/workspace-settings.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { FilesModule } from './files/files.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { PermissionGuard } from './users/guards/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'], isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmailModule,
    UsersModule,
    PlatformModule,
    AuditModule,
    StorageModule,
    CompanyModule,
    CreditsModule,
    AiCatalogModule,
    AiRuntimeModule,
    AgentsModule,
    WorkspaceModule,
    PersonalSpaceModule,
    WorkspaceSettingsModule,
    MarketplaceModule,
    FilesModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
