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
import { CaptionService } from './caption.service';

@Module({
  imports: [PrismaModule, AiRuntimeModule, forwardRef(() => StorageModule)],
  controllers: [],
  providers: [
    DocumentService,
    ChunkService,
    EmbeddingRepository,
    IngestionService,
    RetrievalService,
    CaptionService,
  ],
  exports: [IngestionService, RetrievalService],
})
export class RagModule {}
