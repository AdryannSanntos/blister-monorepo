import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { DesignSystemController } from './design-system.controller';
import { DesignSystemSyncService } from './design-system-sync.service';
import { DesignSystemService } from './design-system.service';

@Module({
  imports: [StorageModule],
  controllers: [DesignSystemController],
  providers: [DesignSystemService, DesignSystemSyncService],
  exports: [DesignSystemService, DesignSystemSyncService],
})
export class DesignSystemModule {}
