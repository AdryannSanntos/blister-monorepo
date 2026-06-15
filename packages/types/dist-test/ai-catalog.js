"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformCompanySchema = exports.updateRagSettingsSchema = exports.ragPlatformSettingsSchema = exports.updateCreditSettingsSchema = exports.platformCreditSettingsSchema = exports.platformAgentAdminItemSchema = exports.platformAgentPolicyViewSchema = exports.updatePipelineSchema = exports.pipelineAgentConfigSchema = exports.platformAgentStepSchema = exports.updateAgentStepPoliciesBatchSchema = exports.AGENT_STEP_TYPES_WITH_MODEL = exports.updateAgentStepPolicySchema = exports.agentStepPolicySchema = exports.updateAgentPolicySchema = exports.agentPolicySchema = exports.updateAiModelSchema = exports.createAiModelSchema = exports.aiModelSchema = exports.addCredentialSchema = exports.updateAiProviderSchema = exports.createAiProviderSchema = exports.aiProviderSchema = void 0;
const zod_1 = require("zod");
exports.aiProviderSchema = zod_1.z.object({
    id: zod_1.z.string(),
    slug: zod_1.z.string(),
    name: zod_1.z.string(),
    isEnabled: zod_1.z.boolean(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.createAiProviderSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(50),
    name: zod_1.z.string().min(1).max(120),
    isEnabled: zod_1.z.boolean().optional().default(true),
});
exports.updateAiProviderSchema = exports.createAiProviderSchema.partial();
exports.addCredentialSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(120),
    value: zod_1.z.string().min(1),
});
exports.aiModelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    providerId: zod_1.z.string(),
    externalId: zod_1.z.string(),
    name: zod_1.z.string(),
    isEnabled: zod_1.z.boolean(),
    inputCostPer1k: zod_1.z.string(),
    outputCostPer1k: zod_1.z.string(),
    maxTokens: zod_1.z.number().nullable(),
    capabilities: zod_1.z.array(zod_1.z.string()),
});
exports.createAiModelSchema = zod_1.z.object({
    providerId: zod_1.z.string(),
    externalId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(120),
    isEnabled: zod_1.z.boolean().optional().default(true),
    inputCostPer1k: zod_1.z.number().positive(),
    outputCostPer1k: zod_1.z.number().positive(),
    maxTokens: zod_1.z.number().int().positive().optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.updateAiModelSchema = exports.createAiModelSchema
    .omit({ providerId: true, externalId: true })
    .partial();
exports.agentPolicySchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    modelId: zod_1.z.string(),
    markupMultiplier: zod_1.z.string(),
    isEnabled: zod_1.z.boolean(),
    minCostPerRun: zod_1.z.string().nullable(),
});
exports.updateAgentPolicySchema = zod_1.z.object({
    modelId: zod_1.z.string().optional(),
    markupMultiplier: zod_1.z.number().positive().optional(),
    isEnabled: zod_1.z.boolean().optional(),
    minCostPerRun: zod_1.z.number().positive().nullable().optional(),
});
exports.agentStepPolicySchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    stepKey: zod_1.z.string(),
    modelId: zod_1.z.string(),
    isEnabled: zod_1.z.boolean(),
});
exports.updateAgentStepPolicySchema = zod_1.z.object({
    modelId: zod_1.z.string().nullable().optional(),
    isEnabled: zod_1.z.boolean().optional(),
});
/** Step types that support per-step model override in platform admin. */
exports.AGENT_STEP_TYPES_WITH_MODEL = [
    'llm_call',
    'image_generation',
    'preparation',
];
exports.updateAgentStepPoliciesBatchSchema = zod_1.z.object({
    steps: zod_1.z.array(zod_1.z.object({
        stepKey: zod_1.z.string().min(1),
        modelId: zod_1.z.string().nullable(),
    })),
});
exports.platformAgentStepSchema = zod_1.z.object({
    key: zod_1.z.string(),
    label: zod_1.z.string(),
    type: zod_1.z.string(),
    modelId: zod_1.z.string().nullable().optional(),
    modelName: zod_1.z.string().nullable().optional(),
    modelExternalId: zod_1.z.string().nullable().optional(),
    usesAgentDefault: zod_1.z.boolean().optional(),
});
exports.pipelineAgentConfigSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    sortOrder: zod_1.z.number(),
    isEnabled: zod_1.z.boolean(),
});
exports.updatePipelineSchema = zod_1.z.object({
    agents: zod_1.z.array(zod_1.z.object({
        agentId: zod_1.z.string(),
        sortOrder: zod_1.z.number().int(),
        isEnabled: zod_1.z.boolean(),
    })),
});
exports.platformAgentPolicyViewSchema = zod_1.z.object({
    modelId: zod_1.z.string(),
    modelName: zod_1.z.string().nullable(),
    modelExternalId: zod_1.z.string().nullable(),
    markupMultiplier: zod_1.z.string(),
    minCostPerRun: zod_1.z.string().nullable(),
    isEnabled: zod_1.z.boolean(),
});
exports.platformAgentAdminItemSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    label: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    icon: zod_1.z.string().nullable(),
    capabilities: zod_1.z.array(zod_1.z.string()),
    isEnabled: zod_1.z.boolean(),
    estimatedCreditCost: zod_1.z.number().nullable(),
    sortOrder: zod_1.z.number(),
    policy: exports.platformAgentPolicyViewSchema.nullable(),
    steps: zod_1.z.array(exports.platformAgentStepSchema),
});
exports.platformCreditSettingsSchema = zod_1.z.object({
    freeTierAmount: zod_1.z.string(),
    currency: zod_1.z.string(),
    markupDefault: zod_1.z.string(),
    minRunCost: zod_1.z.string(),
});
exports.updateCreditSettingsSchema = zod_1.z.object({
    freeTierAmount: zod_1.z.number().positive().optional(),
    markupDefault: zod_1.z.number().positive().optional(),
    minRunCost: zod_1.z.number().positive().optional(),
});
exports.ragPlatformSettingsSchema = zod_1.z.object({
    chunkSize: zod_1.z.number(),
    chunkOverlap: zod_1.z.number(),
    topK: zod_1.z.number(),
    rerankEnabled: zod_1.z.boolean(),
    embeddingModelId: zod_1.z.string().nullable(),
    captionModelId: zod_1.z.string().nullable(),
});
exports.updateRagSettingsSchema = zod_1.z.object({
    chunkSize: zod_1.z.number().int().positive().optional(),
    chunkOverlap: zod_1.z.number().int().min(0).optional(),
    topK: zod_1.z.number().int().positive().optional(),
    rerankEnabled: zod_1.z.boolean().optional(),
    embeddingModelId: zod_1.z.string().nullable().optional(),
    captionModelId: zod_1.z.string().nullable().optional(),
});
exports.platformCompanySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    ownerEmail: zod_1.z.string(),
    creditBalance: zod_1.z.string().nullable(),
    onboardingCompletedAt: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
});
