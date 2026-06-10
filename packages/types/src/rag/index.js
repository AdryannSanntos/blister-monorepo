"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextPackRequestSchema = exports.ragContextPackSchema = exports.ragRetrievedChunkSchema = exports.ragRetrievalQuerySchema = exports.reindexScopeSchema = exports.ingestDocumentSchema = exports.ragIndexJobStatusSchema = exports.ragDocumentStatusSchema = exports.ragSourceTypeSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Source types (aligned with Prisma schema)
// ---------------------------------------------------------------------------
exports.ragSourceTypeSchema = zod_1.z.enum([
    'BRAND_BRAIN',
    'CAMPAIGN',
    'CAMPAIGN_FILE',
    'AGENT_LEARNING',
    'APPROVED_PIECE',
]);
exports.ragDocumentStatusSchema = zod_1.z.enum([
    'PENDING',
    'INDEXING',
    'INDEXED',
    'FAILED',
]);
exports.ragIndexJobStatusSchema = zod_1.z.enum([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
]);
// ---------------------------------------------------------------------------
// Ingest DTOs
// ---------------------------------------------------------------------------
exports.ingestDocumentSchema = zod_1.z.object({
    sourceType: exports.ragSourceTypeSchema,
    sourceId: zod_1.z.string().min(1),
    title: zod_1.z.string().trim().min(1).max(500).optional(),
    content: zod_1.z.string().trim().min(1),
    companyId: zod_1.z.string().min(1),
    campaignId: zod_1.z.string().min(1).optional(),
    agentId: zod_1.z.string().min(1).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    forceReindex: zod_1.z.boolean().default(false),
});
exports.reindexScopeSchema = zod_1.z.object({
    sourceType: exports.ragSourceTypeSchema.optional(),
    sourceIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    companyId: zod_1.z.string().min(1).optional(),
});
// ---------------------------------------------------------------------------
// Retrieval DTOs
// ---------------------------------------------------------------------------
exports.ragRetrievalQuerySchema = zod_1.z.object({
    query: zod_1.z.string().trim().min(1).max(4_000),
    companyId: zod_1.z.string().min(1),
    limit: zod_1.z.number().min(1).max(50).default(8),
    minScore: zod_1.z.number().min(0).max(1).optional(),
    sourceTypes: zod_1.z.array(exports.ragSourceTypeSchema).optional(),
    campaignId: zod_1.z.string().min(1).optional(),
    agentId: zod_1.z.string().min(1).optional(),
    boostAgentId: zod_1.z.string().min(1).optional(),
    boostCampaignId: zod_1.z.string().min(1).optional(),
});
exports.ragRetrievedChunkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    documentId: zod_1.z.string(),
    sourceType: exports.ragSourceTypeSchema,
    sourceId: zod_1.z.string(),
    title: zod_1.z.string().nullable(),
    content: zod_1.z.string(),
    score: zod_1.z.number(),
    chunkIndex: zod_1.z.number(),
    agentId: zod_1.z.string().nullable(),
    campaignId: zod_1.z.string().nullable(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.ragContextPackSchema = zod_1.z.object({
    query: zod_1.z.string(),
    companyId: zod_1.z.string(),
    chunks: zod_1.z.array(exports.ragRetrievedChunkSchema),
    totalFound: zod_1.z.number(),
    agentId: zod_1.z.string().optional(),
    campaignId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// Context Pack Request
// ---------------------------------------------------------------------------
exports.buildContextPackRequestSchema = zod_1.z.object({
    companyId: zod_1.z.string().min(1),
    query: zod_1.z.string().trim().min(1),
    agentId: zod_1.z.string().min(1).optional(),
    campaignId: zod_1.z.string().min(1).optional(),
    limit: zod_1.z.number().min(1).max(50).default(8),
    includeBrandBrain: zod_1.z.boolean().default(true),
    includeAgentLearning: zod_1.z.boolean().default(true),
    includeCampaignContext: zod_1.z.boolean().default(true),
});
