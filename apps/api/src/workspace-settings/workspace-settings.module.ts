import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { WorkspaceSettingsController } from './workspace-settings.controller';
import { WorkspaceSettingsService } from './workspace-settings.service';

@Module({
  imports: [WorkspaceModule, MarketplaceModule],
  controllers: [WorkspaceSettingsController],
  providers: [WorkspaceSettingsService],
  exports: [WorkspaceSettingsService],
})
export class WorkspaceSettingsModule {}
