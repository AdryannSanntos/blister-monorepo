"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragRetrievalQuerySchema = exports.ingestDocumentSchema = exports.ragDocumentStatusSchema = exports.ragSourceTypeSchema = void 0;
const zod_1 = require("zod");
exports.ragSourceTypeSchema = zod_1.z.enum([
    'WORKSPACE_SETTINGS',
    'WORKSPACE_FILE',
    'AGENT_LEARNING',
]);
exports.ragDocumentStatusSchema = zod_1.z.enum([
    'PENDING',
    'INDEXING',
    'INDEXED',
    'FAILED',
]);
exports.ingestDocumentSchema = zod_1.z.object({
    companyId: zod_1.z.string().min(1),
    sourceType: exports.ragSourceTypeSchema,
    sourceId: zod_1.z.string().min(1),
    title: zod_1.z.string().optional(),
    content: zod_1.z.string().min(1),
    agentId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    forceReindex: zod_1.z.boolean().optional(),
});
exports.ragRetrievalQuerySchema = zod_1.z.object({
    companyId: zod_1.z.string().min(1),
    query: zod_1.z.string().min(1),
    limit: zod_1.z.number().int().positive().optional(),
    minScore: zod_1.z.number().optional(),
    sourceTypes: zod_1.z.array(exports.ragSourceTypeSchema).optional(),
    agentId: zod_1.z.string().optional(),
    boostAgentId: zod_1.z.string().optional(),
});
