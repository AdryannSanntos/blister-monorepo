import { z } from 'zod';

// ---------------------------------------------------------------------------
// Source types (aligned with Prisma schema)
// ---------------------------------------------------------------------------

export const ragSourceTypeSchema = z.enum([
  'BRAND_BRAIN',
  'CAMPAIGN',
  'CAMPAIGN_FILE',
  'AGENT_LEARNING',
  'APPROVED_PIECE',
]);

export const ragDocumentStatusSchema = z.enum([
  'PENDING',
  'INDEXING',
  'INDEXED',
  'FAILED',
]);

export const ragIndexJobStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

// ---------------------------------------------------------------------------
// Ingest DTOs
// ---------------------------------------------------------------------------

export const ingestDocumentSchema = z.object({
  sourceType: ragSourceTypeSchema,
  sourceId: z.string().min(1),
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().trim().min(1),
  companyId: z.string().min(1),
  campaignId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  forceReindex: z.boolean().default(false),
});

export const reindexScopeSchema = z.object({
  sourceType: ragSourceTypeSchema.optional(),
  sourceIds: z.array(z.string().min(1)).optional(),
  companyId: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Retrieval DTOs
// ---------------------------------------------------------------------------

export const ragRetrievalQuerySchema = z.object({
  query: z.string().trim().min(1).max(4_000),
  companyId: z.string().min(1),
  limit: z.number().min(1).max(50).default(8),
  minScore: z.number().min(0).max(1).optional(),
  sourceTypes: z.array(ragSourceTypeSchema).optional(),
  campaignId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  boostAgentId: z.string().min(1).optional(),
  boostCampaignId: z.string().min(1).optional(),
});

export const ragRetrievedChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  sourceType: ragSourceTypeSchema,
  sourceId: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  score: z.number(),
  chunkIndex: z.number(),
  agentId: z.string().nullable(),
  campaignId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const ragContextPackSchema = z.object({
  query: z.string(),
  companyId: z.string(),
  chunks: z.array(ragRetrievedChunkSchema),
  totalFound: z.number(),
  agentId: z.string().optional(),
  campaignId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Context Pack Request
// ---------------------------------------------------------------------------

export const buildContextPackRequestSchema = z.object({
  companyId: z.string().min(1),
  query: z.string().trim().min(1),
  agentId: z.string().min(1).optional(),
  campaignId: z.string().min(1).optional(),
  limit: z.number().min(1).max(50).default(8),
  includeBrandBrain: z.boolean().default(true),
  includeAgentLearning: z.boolean().default(true),
  includeCampaignContext: z.boolean().default(true),
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
export type BuildContextPackRequest = z.infer<typeof buildContextPackRequestSchema>;
