"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRunEventSchema = exports.agentRunBlockDtoSchema = exports.messageEndEventDataSchema = exports.blockEndEventDataSchema = exports.blockDeltaEventDataSchema = exports.blockStartEventDataSchema = exports.messageStartEventDataSchema = exports.agentRunBlockStatusSchema = exports.agentRunBlockRoleSchema = exports.blockTypeSchema = exports.agentRunEventTypeSchema = exports.agentCatalogSchema = exports.agentCatalogItemSchema = exports.stepResultSchema = exports.stepContextSchema = exports.regenerateAgentRunSchema = exports.editAgentRunOutputSchema = exports.rejectAgentRunSchema = exports.approveAgentRunSchema = exports.agentRunStepDtoSchema = exports.agentRunStatusDtoSchema = exports.reviewCutsSchema = exports.resumeAgentRequestSchema = exports.runAgentRequestSchema = exports.agentDefinitionSchema = exports.agentCapabilitySchema = exports.reviewActionSchema = exports.reviewStatusSchema = exports.stepResultTypeSchema = exports.agentRunStepStatusSchema = exports.agentRunStatusSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Agent Status (aligned with Prisma schema)
// ---------------------------------------------------------------------------
exports.agentRunStatusSchema = zod_1.z.enum([
    'QUEUED',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
]);
exports.agentRunStepStatusSchema = zod_1.z.enum([
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'SKIPPED',
]);
exports.stepResultTypeSchema = zod_1.z.enum([
    'CONTINUE',
    'PAUSED',
    'FAILED',
    'COMPLETE',
]);
// ---------------------------------------------------------------------------
// Review Status (for AgentRun)
// ---------------------------------------------------------------------------
exports.reviewStatusSchema = zod_1.z.enum([
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'EDITED',
]);
exports.reviewActionSchema = zod_1.z.enum([
    'approve',
    'reject',
    'edit',
    'regenerate',
]);
// ---------------------------------------------------------------------------
// Agent Definition (contract per agent)
// ---------------------------------------------------------------------------
exports.agentCapabilitySchema = zod_1.z.enum([
    'text_generation',
    'image_generation',
    'strategy',
    'planning',
    'analysis',
]);
exports.agentDefinitionSchema = zod_1.z.object({
    agentId: zod_1.z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
    label: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.string().optional(),
    capabilities: zod_1.z.array(exports.agentCapabilitySchema).default([]),
    inputSchema: zod_1.z.any(),
    outputSchema: zod_1.z.any(),
    reviewSchema: zod_1.z.any().optional(),
    steps: zod_1.z.array(zod_1.z.object({
        key: zod_1.z.string().min(1),
        label: zod_1.z.string().min(1),
        type: zod_1.z.enum(['llm_call', 'validation', 'form', 'decision', 'output']),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })),
    isEnabled: zod_1.z.boolean().default(true),
    estimatedCreditCost: zod_1.z.number().min(0).optional(),
});
// ---------------------------------------------------------------------------
// Run Agent Request
// ---------------------------------------------------------------------------
exports.runAgentRequestSchema = zod_1.z.object({
    userInput: zod_1.z.string().trim().min(1).max(10_000),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// Resume Agent Request
// ---------------------------------------------------------------------------
exports.resumeAgentRequestSchema = zod_1.z.object({
    formData: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
var cuts_1 = require("./agents/cuts");
Object.defineProperty(exports, "reviewCutsSchema", { enumerable: true, get: function () { return cuts_1.reviewCutsSchema; } });
// ---------------------------------------------------------------------------
// Agent Run Status DTO
// ---------------------------------------------------------------------------
exports.agentRunStatusDtoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    agentId: zod_1.z.string(),
    companyId: zod_1.z.string(),
    status: exports.agentRunStatusSchema,
    currentStepKey: zod_1.z.string().nullable(),
    inputPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    outputPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    errorMessage: zod_1.z.string().nullable(),
    pauseReason: zod_1.z.string().nullable(),
    pauseFormSchema: zod_1.z.any().nullable(),
    reviewStatus: exports.reviewStatusSchema.nullable(),
    creditCost: zod_1.z.number().nullable(),
    createdAt: zod_1.z.string(),
    startedAt: zod_1.z.string().nullable(),
    completedAt: zod_1.z.string().nullable(),
});
// ---------------------------------------------------------------------------
// Agent Run Step DTO
// ---------------------------------------------------------------------------
exports.agentRunStepDtoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    stepKey: zod_1.z.string(),
    stepIndex: zod_1.z.number(),
    status: exports.agentRunStepStatusSchema,
    resultType: exports.stepResultTypeSchema.nullable(),
    inputPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    outputPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    errorMessage: zod_1.z.string().nullable(),
    llmModel: zod_1.z.string().nullable(),
    tokensInput: zod_1.z.number().nullable(),
    tokensOutput: zod_1.z.number().nullable(),
    creditCost: zod_1.z.number().nullable(),
    startedAt: zod_1.z.string().nullable(),
    completedAt: zod_1.z.string().nullable(),
});
// ---------------------------------------------------------------------------
// Review Agent Run DTOs
// ---------------------------------------------------------------------------
exports.approveAgentRunSchema = zod_1.z.object({
    reason: zod_1.z.string().max(1000).optional(),
});
exports.rejectAgentRunSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(1000),
});
exports.editAgentRunOutputSchema = zod_1.z.object({
    editedOutput: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    reason: zod_1.z.string().max(1000).optional(),
});
exports.regenerateAgentRunSchema = zod_1.z.object({
    userInput: zod_1.z.string().trim().min(1).max(10_000).optional(),
    instruction: zod_1.z.string().trim().max(2000).optional(),
});
// ---------------------------------------------------------------------------
// Step Context (internal runtime)
// ---------------------------------------------------------------------------
exports.stepContextSchema = zod_1.z.object({
    runId: zod_1.z.string(),
    agentId: zod_1.z.string(),
    companyId: zod_1.z.string(),
    stepKey: zod_1.z.string(),
    stepIndex: zod_1.z.number(),
    inputPayload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    previousStepsOutput: zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())),
});
exports.stepResultSchema = zod_1.z.object({
    type: exports.stepResultTypeSchema,
    output: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    error: zod_1.z.string().optional(),
    pauseReason: zod_1.z.string().optional(),
    pauseFormSchema: zod_1.z.any().optional(),
    llmModel: zod_1.z.string().optional(),
    tokensInput: zod_1.z.number().optional(),
    tokensOutput: zod_1.z.number().optional(),
    creditCost: zod_1.z.number().optional(),
});
// ---------------------------------------------------------------------------
// Agent List DTO (for admin catalog)
// ---------------------------------------------------------------------------
exports.agentCatalogItemSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    label: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    icon: zod_1.z.string().nullable(),
    capabilities: zod_1.z.array(exports.agentCapabilitySchema),
    isEnabled: zod_1.z.boolean(),
    estimatedCreditCost: zod_1.z.number().nullable(),
    sortOrder: zod_1.z.number(),
});
exports.agentCatalogSchema = zod_1.z.object({
    agents: zod_1.z.array(exports.agentCatalogItemSchema),
    total: zod_1.z.number(),
});
// ---------------------------------------------------------------------------
// SSE Event Types
// ---------------------------------------------------------------------------
exports.agentRunEventTypeSchema = zod_1.z.enum([
    'run_started',
    'run_paused',
    'run_completed',
    'run_failed',
    'run_cancelled',
    // legacy (no longer consumed by the chat UI; kept for compatibility)
    'step_started',
    'step_completed',
    'step_failed',
    'output_chunk',
    // block protocol
    'message_start',
    'block_start',
    'block_delta',
    'block_end',
    'message_end',
    // cuts progressive rendering
    'cut_rendered',
    'all_cuts_rendered',
]);
exports.blockTypeSchema = zod_1.z.enum([
    'thinking',
    'searching_context',
    'planning',
    'working',
    'text',
    'form_question',
    'output',
    'error',
]);
exports.agentRunBlockRoleSchema = zod_1.z.enum(['user', 'assistant']);
exports.agentRunBlockStatusSchema = zod_1.z.enum(['streaming', 'complete', 'error']);
exports.messageStartEventDataSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    role: exports.agentRunBlockRoleSchema,
});
exports.blockStartEventDataSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    blockId: zod_1.z.string(),
    blockType: exports.blockTypeSchema,
    index: zod_1.z.number().int().nonnegative(),
    label: zod_1.z.string().optional(),
    stepKey: zod_1.z.string().optional(),
});
exports.blockDeltaEventDataSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    blockId: zod_1.z.string(),
    delta: zod_1.z.string(),
});
exports.blockEndEventDataSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    blockId: zod_1.z.string(),
    status: exports.agentRunBlockStatusSchema,
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.messageEndEventDataSchema = zod_1.z.object({ messageId: zod_1.z.string() });
exports.agentRunBlockDtoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    messageId: zod_1.z.string(),
    role: exports.agentRunBlockRoleSchema,
    blockType: exports.blockTypeSchema,
    index: zod_1.z.number().int(),
    label: zod_1.z.string().nullable(),
    text: zod_1.z.string().nullable(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    stepKey: zod_1.z.string().nullable(),
    status: exports.agentRunBlockStatusSchema,
    createdAt: zod_1.z.string(),
});
exports.agentRunEventSchema = zod_1.z.object({
    type: exports.agentRunEventTypeSchema,
    runId: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
