import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { CreditsService } from './credits.service';
import { OrganizationCreditsController, PlatformCostsController } from './credits.controller';

@Module({
  imports: [PlatformModule],
  controllers: [OrganizationCreditsController, PlatformCostsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
