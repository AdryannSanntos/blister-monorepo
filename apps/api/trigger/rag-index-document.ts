import { task, logger } from '@trigger.dev/sdk';
import { PrismaClient } from '@company-os/db';
import { ConfigService } from '@nestjs/config';
import { createAgentIaSdk } from '@company-os/agent-ia-sdk';
import { loadProviderSecrets } from '../src/integrations/agent-ia-sdk/load-provider-secrets';
import { z } from 'zod';

const prisma = new PrismaClient();
const sdk = createAgentIaSdk({
  prisma,
  secrets: loadProviderSecrets(new ConfigService()),
});

const ingestPayloadSchema = z.object({
  companyId: z.string().min(1),
  sourceType: z.enum([
    'WORKSPACE_SETTINGS',
    'WORKSPACE_FILE',
    'AGENT_LEARNING',
  ]),
  sourceId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1),
  agentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  forceReindex: z.boolean().default(false),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export const ragIndexDocument = task({
  id: 'rag-index-document',
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: IngestPayload) => {
    const validated = ingestPayloadSchema.parse(payload);
    logger.info('Starting RAG indexing', {
      sourceType: validated.sourceType,
      sourceId: validated.sourceId,
      companyId: validated.companyId,
    });

    // All ingestion logic (dedupe → chunk → embed → index) lives in the SDK.
    const result = await sdk.ia.rag.ingest(validated);

    logger.info('RAG indexing completed', {
      documentId: result.documentId,
      status: result.status,
      chunksCreated: result.chunksCreated,
      embeddingsCreated: result.embeddingsCreated,
    });

    return result;
  },
});
