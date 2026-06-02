import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RagChunkingService } from './rag-chunking.service';
import { RagContextAssemblyService } from './rag-context-assembly.service';
import { RagDocumentService } from './rag-document.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagIndexingService } from './rag-indexing.service';
import { RagPolicyService } from './rag-policy.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { RagSourceRegistry } from './rag-source-registry.service';
import { RagController } from './rag.controller';
import { WebResearchCacheService } from './web-research-cache.service';

@Module({
  imports: [PrismaModule, AIRuntimeModule],
  controllers: [RagController],
  providers: [
    RagSourceRegistry,
    RagDocumentService,
    RagChunkingService,
    RagEmbeddingService,
    RagIndexingService,
    RagRetrievalService,
    RagPolicyService,
    RagContextAssemblyService,
    WebResearchCacheService,
  ],
  exports: [
    RagSourceRegistry,
    RagDocumentService,
    RagIndexingService,
    RagRetrievalService,
    RagContextAssemblyService,
    RagPolicyService,
    WebResearchCacheService,
  ],
})
export class RagModule {}
