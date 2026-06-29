import { z } from 'zod';

export const ragSourceTypeSchema = z.enum([
  'WORKSPACE_SETTINGS',
  'WORKSPACE_FILE',
  'AGENT_LEARNING',
]);

export type RagSourceType = z.infer<typeof ragSourceTypeSchema>;

export const ragDocumentStatusSchema = z.enum([
  'PENDING',
  'INDEXING',
  'INDEXED',
  'FAILED',
]);

export type RagDocumentStatus = z.infer<typeof ragDocumentStatusSchema>;

export const ingestDocumentSchema = z.object({
  companyId: z.string().min(1),
  sourceType: ragSourceTypeSchema,
  sourceId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1),
  agentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  forceReindex: z.boolean().optional(),
});

export type IngestDocumentDto = z.infer<typeof ingestDocumentSchema>;

export const ragRetrievalQuerySchema = z.object({
  companyId: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
  minScore: z.number().optional(),
  sourceTypes: z.array(ragSourceTypeSchema).optional(),
  agentId: z.string().optional(),
  boostAgentId: z.string().optional(),
});

export type RagRetrievalQuery = z.infer<typeof ragRetrievalQuerySchema>;

export type RagRetrievedChunk = {
  id: string;
  documentId: string;
  sourceType: RagSourceType;
  sourceId: string;
  title: string | null;
  content: string;
  score: number;
  chunkIndex: number;
  agentId: string | null;
  metadata: Record<string, unknown>;
};
