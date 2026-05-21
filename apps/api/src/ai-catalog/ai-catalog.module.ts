import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { AICatalogController } from './ai-catalog.controller';
import { AICatalogService } from './ai-catalog.service';

@Module({
  imports: [PlatformModule],
  controllers: [AICatalogController],
  providers: [AICatalogService],
  exports: [AICatalogService],
})
export class AICatalogModule {}
