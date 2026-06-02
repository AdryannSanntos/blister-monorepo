import { schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaService } from '../src/prisma/prisma.service';
import { RagChunkingService } from '../src/rag/rag-chunking.service';
import { RagDocumentService } from '../src/rag/rag-document.service';
import { RagEmbeddingService } from '../src/rag/rag-embedding.service';
import { RagIndexingService } from '../src/rag/rag-indexing.service';
import { createAIRuntimeService } from './shared/ai-runtime';

const ragReindexScopeTaskPayloadSchema = z.object({
  organizationId: z.string().min(1),
  sourceType: z.string().optional(),
  sourceIds: z.array(z.string()).optional(),
  triggeredByUserId: z.string().optional(),
});

export type RagReindexScopeTaskPayload = z.infer<typeof ragReindexScopeTaskPayloadSchema>;

export const ragReindexScopeTask = schemaTask({
  id: 'rag-reindex-scope',
  schema: ragReindexScopeTaskPayloadSchema,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 120_000 },
  run: async (payload) => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    try {
      const aiRuntime = createAIRuntimeService(prisma);

      const documentService = new RagDocumentService(prisma);
      const chunkingService = new RagChunkingService(prisma);
      const embeddingService = new RagEmbeddingService(prisma, aiRuntime);
      const indexingService = new RagIndexingService(
        prisma,
        documentService,
        chunkingService,
        embeddingService,
      );

      return await indexingService.reindexScope(
        payload.organizationId,
        {
          sourceType: payload.sourceType,
          sourceIds: payload.sourceIds,
        },
        payload.triggeredByUserId,
      );
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
