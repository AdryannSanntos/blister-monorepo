import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CreditsModule } from '../credits/credits.module';
import { PlatformModule } from '../platform/platform.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiCatalogController } from './ai-catalog.controller';
import { ModelsService } from './models.service';
import { PlatformCompaniesService } from './platform-companies.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PoliciesService } from './policies.service';
import { ProvidersService } from './providers.service';

@Module({
  imports: [PrismaModule, AuditModule, CreditsModule, PlatformModule],
  controllers: [AiCatalogController],
  providers: [
    ProvidersService,
    ModelsService,
    PoliciesService,
    PlatformSettingsService,
    PlatformCompaniesService,
  ],
})
export class AiCatalogModule {}
