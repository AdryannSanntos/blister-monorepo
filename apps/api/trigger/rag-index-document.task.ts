import { schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaService } from '../src/prisma/prisma.service';
import { RagChunkingService } from '../src/rag/rag-chunking.service';
import { RagDocumentService } from '../src/rag/rag-document.service';
import { RagEmbeddingService } from '../src/rag/rag-embedding.service';
import { RagIndexingService } from '../src/rag/rag-indexing.service';
import { createAIRuntimeService } from './shared/ai-runtime';

export const ragIndexDocumentTaskPayloadSchema = z.object({
  organizationId: z.string().min(1),
  documentId: z.string().min(1),
  content: z.string().min(1),
  triggeredByUserId: z.string().optional(),
});

export type RagIndexDocumentTaskPayload = z.infer<typeof ragIndexDocumentTaskPayloadSchema>;

export const ragIndexDocumentTask = schemaTask({
  id: 'rag-index-document',
  schema: ragIndexDocumentTaskPayloadSchema,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000 },
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

      // Fetch the document to get source metadata
      const doc = await documentService.getDocument(
        payload.organizationId,
        payload.documentId,
      );

      return await indexingService.ingest(
        payload.organizationId,
        {
          sourceType: doc.sourceType as
            | 'brain_entry'
            | 'asset'
            | 'design_system'
            | 'design_asset'
            | 'agent_context_file'
            | 'context_source'
            | 'manual',
          sourceId: doc.sourceId ?? undefined,
          title: doc.title ?? undefined,
          content: payload.content,
          metadata: (doc.metadata as Record<string, unknown>) ?? {},
          forceReindex: true,
        },
        payload.triggeredByUserId,
      );
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
