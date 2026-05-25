import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RagContextAssemblyService } from './rag-context-assembly.service';
import { RagChunkingService } from './rag-chunking.service';
import { RagController } from './rag.controller';
import { RagDocumentService } from './rag-document.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagIndexingService } from './rag-indexing.service';
import { RagPolicyService } from './rag-policy.service';
import { RagRetrievalService } from './rag-retrieval.service';

@Module({
  imports: [PrismaModule, AIRuntimeModule],
  controllers: [RagController],
  providers: [
    RagDocumentService,
    RagChunkingService,
    RagEmbeddingService,
    RagIndexingService,
    RagRetrievalService,
    RagPolicyService,
    RagContextAssemblyService,
  ],
  exports: [
    RagDocumentService,
    RagIndexingService,
    RagRetrievalService,
    RagContextAssemblyService,
    RagPolicyService,
  ],
})
export class RagModule {}
