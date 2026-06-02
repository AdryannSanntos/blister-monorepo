import { PrismaService } from '../../src/prisma/prisma.service';
import { RagChunkingService } from '../../src/rag/rag-chunking.service';
import { RagDocumentService } from '../../src/rag/rag-document.service';
import { RagEmbeddingService } from '../../src/rag/rag-embedding.service';
import { RagIndexingService } from '../../src/rag/rag-indexing.service';
import { createAIRuntimeService } from './ai-runtime';

export function createRagIndexingService(prisma: PrismaService): RagIndexingService {
  const aiRuntime = createAIRuntimeService(prisma);

  const documentService = new RagDocumentService(prisma);
  const chunkingService = new RagChunkingService(prisma);
  const embeddingService = new RagEmbeddingService(prisma, aiRuntime);

  return new RagIndexingService(
    prisma,
    documentService,
    chunkingService,
    embeddingService,
  );
}
