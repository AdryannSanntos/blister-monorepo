import {
  Module,
  forwardRef,
} from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentService } from './document.service';
import { ChunkService } from './chunk.service';
import { EmbeddingRepository } from './embedding.repository';
import { IngestionService } from './ingestion.service';
import { RetrievalService } from './retrieval.service';
import { ContextPackService } from './context-pack.service';
import { RagEventsService } from './rag-events.service';
import { CompanyRagSyncService } from './company-rag-sync.service';
import { CaptionService } from './caption.service';
import { RagAdminController } from './rag-admin.controller';

@Module({
  imports: [PrismaModule, AiRuntimeModule, forwardRef(() => StorageModule)],
  controllers: [RagAdminController],
  providers: [
    DocumentService,
    ChunkService,
    EmbeddingRepository,
    IngestionService,
    RetrievalService,
    ContextPackService,
    RagEventsService,
    CompanyRagSyncService,
    CaptionService,
  ],
  exports: [
    IngestionService,
    RetrievalService,
    ContextPackService,
    RagEventsService,
    CompanyRagSyncService,
  ],
})
export class RagModule {}
