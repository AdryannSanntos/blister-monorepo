import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [WorkspaceModule, CreditsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
