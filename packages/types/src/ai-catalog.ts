import { z } from 'zod';

export const aiProviderSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const createAiProviderSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
});
export type CreateAiProviderDto = z.infer<typeof createAiProviderSchema>;

export const updateAiProviderSchema = createAiProviderSchema.partial();
export type UpdateAiProviderDto = z.infer<typeof updateAiProviderSchema>;

export const addCredentialSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1),
});
export type AddCredentialDto = z.infer<typeof addCredentialSchema>;

export const aiModelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  externalId: z.string(),
  name: z.string(),
  isEnabled: z.boolean(),
  inputCostPer1k: z.string(),
  outputCostPer1k: z.string(),
  maxTokens: z.number().nullable(),
  capabilities: z.array(z.string()),
});
export type AiModel = z.infer<typeof aiModelSchema>;

export const createAiModelSchema = z.object({
  providerId: z.string(),
  externalId: z.string().min(1),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
  inputCostPer1k: z.number().positive(),
  outputCostPer1k: z.number().positive(),
  maxTokens: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional().default([]),
});
export type CreateAiModelDto = z.infer<typeof createAiModelSchema>;

export const updateAiModelSchema = createAiModelSchema
  .omit({ providerId: true, externalId: true })
  .partial();
export type UpdateAiModelDto = z.infer<typeof updateAiModelSchema>;

export const agentPolicySchema = z.object({
  agentId: z.string(),
  modelId: z.string(),
  markupMultiplier: z.string(),
  isEnabled: z.boolean(),
  minCostPerRun: z.string().nullable(),
});
export type AgentPolicy = z.infer<typeof agentPolicySchema>;

export const updateAgentPolicySchema = z.object({
  modelId: z.string().optional(),
  markupMultiplier: z.number().positive().optional(),
  isEnabled: z.boolean().optional(),
  minCostPerRun: z.number().positive().nullable().optional(),
});
export type UpdateAgentPolicyDto = z.infer<typeof updateAgentPolicySchema>;

export const pipelineAgentConfigSchema = z.object({
  agentId: z.string(),
  sortOrder: z.number(),
  isEnabled: z.boolean(),
});
export type PipelineAgentConfig = z.infer<typeof pipelineAgentConfigSchema>;

export const updatePipelineSchema = z.object({
  agents: z.array(
    z.object({
      agentId: z.string(),
      sortOrder: z.number().int(),
      isEnabled: z.boolean(),
    }),
  ),
});
export type UpdatePipelineDto = z.infer<typeof updatePipelineSchema>;

export const platformAgentStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
});
export type PlatformAgentStep = z.infer<typeof platformAgentStepSchema>;

export const platformAgentPolicyViewSchema = z.object({
  modelId: z.string(),
  modelName: z.string().nullable(),
  modelExternalId: z.string().nullable(),
  markupMultiplier: z.string(),
  minCostPerRun: z.string().nullable(),
  isEnabled: z.boolean(),
});
export type PlatformAgentPolicyView = z.infer<typeof platformAgentPolicyViewSchema>;

export const platformAgentAdminItemSchema = z.object({
  agentId: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  capabilities: z.array(z.string()),
  isEnabled: z.boolean(),
  estimatedCreditCost: z.number().nullable(),
  sortOrder: z.number(),
  policy: platformAgentPolicyViewSchema.nullable(),
  steps: z.array(platformAgentStepSchema),
});
export type PlatformAgentAdminItem = z.infer<typeof platformAgentAdminItemSchema>;

export const platformCreditSettingsSchema = z.object({
  freeTierAmount: z.string(),
  currency: z.string(),
  markupDefault: z.string(),
  minRunCost: z.string(),
});
export type PlatformCreditSettings = z.infer<typeof platformCreditSettingsSchema>;

export const updateCreditSettingsSchema = z.object({
  freeTierAmount: z.number().positive().optional(),
  markupDefault: z.number().positive().optional(),
  minRunCost: z.number().positive().optional(),
});
export type UpdateCreditSettingsDto = z.infer<typeof updateCreditSettingsSchema>;

export const ragPlatformSettingsSchema = z.object({
  chunkSize: z.number(),
  chunkOverlap: z.number(),
  topK: z.number(),
  rerankEnabled: z.boolean(),
  embeddingModelId: z.string().nullable(),
  captionModelId: z.string().nullable(),
});
export type RagPlatformSettings = z.infer<typeof ragPlatformSettingsSchema>;

export const updateRagSettingsSchema = z.object({
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
  topK: z.number().int().positive().optional(),
  rerankEnabled: z.boolean().optional(),
  embeddingModelId: z.string().nullable().optional(),
  captionModelId: z.string().nullable().optional(),
});
export type UpdateRagSettingsDto = z.infer<typeof updateRagSettingsSchema>;

export const platformCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerEmail: z.string(),
  creditBalance: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PlatformCompany = z.infer<typeof platformCompanySchema>;
