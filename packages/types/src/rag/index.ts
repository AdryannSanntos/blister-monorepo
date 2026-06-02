import { z } from 'zod';

// ---------------------------------------------------------------------------
// Source types
// ---------------------------------------------------------------------------

export const ragSourceTypeSchema = z.enum([
  'brain_entry',
  'asset',
  'design_system',
  'design_asset',
  'agent_context_file',
  'agent_context_reference',
  'context_source',
  'web_research',
  'manual',
]);

export const ragDocumentStatusSchema = z.enum(['pending', 'indexed', 'failed', 'archived']);

export const ragIndexJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

// ---------------------------------------------------------------------------
// Ingest DTOs
// ---------------------------------------------------------------------------

export const ingestDocumentSchema = z.strictObject({
  sourceType: ragSourceTypeSchema,
  sourceId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  forceReindex: z.boolean().default(false),
});

export const reindexScopeSchema = z.strictObject({
  sourceType: ragSourceTypeSchema.optional(),
  sourceIds: z.array(z.string().min(1)).optional(),
});

// ---------------------------------------------------------------------------
// Retrieval DTOs
// ---------------------------------------------------------------------------

export const ragRetrievalQuerySchema = z.strictObject({
  query: z.string().trim().min(1).max(4_000),
  limit: z.int().min(1).max(50).default(8),
  minScore: z.number().min(0).max(1).optional(),
  sourceTypes: z.array(ragSourceTypeSchema).optional(),
});

export const ragRetrievedChunkSchema = z.strictObject({
  id: z.string(),
  documentId: z.string(),
  sourceType: ragSourceTypeSchema,
  sourceId: z.string().nullable(),
  title: z.string().nullable(),
  snippet: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()),
});

export const ragContextPackSchema = z.strictObject({
  query: z.string(),
  chunks: z.array(ragRetrievedChunkSchema),
  totalFound: z.int(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RagSourceType = z.infer<typeof ragSourceTypeSchema>;
export type RagDocumentStatus = z.infer<typeof ragDocumentStatusSchema>;
export type RagIndexJobStatus = z.infer<typeof ragIndexJobStatusSchema>;
export type IngestDocumentDto = z.infer<typeof ingestDocumentSchema>;
export type ReindexScopeDto = z.infer<typeof reindexScopeSchema>;
export type RagRetrievalQuery = z.infer<typeof ragRetrievalQuerySchema>;
export type RagRetrievedChunk = z.infer<typeof ragRetrievedChunkSchema>;
export type RagContextPack = z.infer<typeof ragContextPackSchema>;
