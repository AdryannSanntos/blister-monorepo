import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';
import { ContextSyncService } from './context-sync.service';

@Module({
  imports: [StorageModule],
  controllers: [ContextController],
  providers: [ContextService, ContextSyncService],
  exports: [ContextService, ContextSyncService],
})
export class ContextModule {}
