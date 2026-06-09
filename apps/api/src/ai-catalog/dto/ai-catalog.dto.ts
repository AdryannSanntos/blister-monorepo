import { z } from 'zod';

export const createProviderSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
});

export const updateProviderSchema = createProviderSchema.partial();

export const addCredentialSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1),
});

export const createModelSchema = z.object({
  providerId: z.string(),
  externalId: z.string().min(1),
  name: z.string().min(1).max(120),
  isEnabled: z.boolean().optional().default(true),
  inputCostPer1k: z.number().positive(),
  outputCostPer1k: z.number().positive(),
  maxTokens: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional().default([]),
});

export const updateModelSchema = createModelSchema
  .omit({ providerId: true, externalId: true })
  .partial();

export const updateAgentPolicySchema = z.object({
  modelId: z.string().optional(),
  markupMultiplier: z.number().positive().optional(),
  isEnabled: z.boolean().optional(),
  minCostPerRun: z.number().positive().nullable().optional(),
});

export const updatePipelineSchema = z.object({
  agents: z.array(
    z.object({
      agentId: z.string(),
      sortOrder: z.number().int(),
      isEnabled: z.boolean(),
    }),
  ),
});

export const updateCreditSettingsSchema = z.object({
  freeTierAmount: z.number().positive().optional(),
  markupDefault: z.number().positive().optional(),
  minRunCost: z.number().positive().optional(),
});

export const updateRagSettingsSchema = z.object({
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
  topK: z.number().int().positive().optional(),
  rerankEnabled: z.boolean().optional(),
  embeddingModelId: z.string().nullable().optional(),
  captionModelId: z.string().nullable().optional(),
});

export const adjustCompanyCreditSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUST']),
  reason: z.string().min(1),
});

export const platformCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});
