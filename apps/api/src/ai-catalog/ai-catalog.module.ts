import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { PlatformModule } from '../platform/platform.module';
import { AICatalogController } from './ai-catalog.controller';
import { OrganizationAICatalogController } from './organization-ai-catalog.controller';
import { AICatalogService } from './ai-catalog.service';

@Module({
  imports: [PlatformModule, AIRuntimeModule],
  controllers: [AICatalogController, OrganizationAICatalogController],
  providers: [AICatalogService],
  exports: [AICatalogService],
})
export class AICatalogModule {}
