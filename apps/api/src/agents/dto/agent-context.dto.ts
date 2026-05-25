import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

export const agentContextReferenceSourceSchema = z.enum([
  'context_source',
  'asset',
  'design_system_profile',
  'integration_reference',
]);

export const agentContextReferenceSchema = z.strictObject({
  sourceType: agentContextReferenceSourceSchema,
  sourceId: z.string().min(1),
  metadata: jsonObjectSchema.optional(),
});

export const agentContextFileSchema = z.strictObject({
  id: z.string().min(1).optional(),
  filename: z.string().trim().min(1).max(260),
  objectKey: z.string().min(1),
  publicUrl: z.url().optional(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.int().nonnegative(),
  status: z.enum(['active', 'archived']).default('active'),
  metadata: jsonObjectSchema.optional(),
});

export const upsertAgentContextSchema = z.strictObject({
  instructions: z.string().trim().max(20_000).optional(),
  notes: z.string().trim().max(20_000).optional(),
  metadata: jsonObjectSchema.optional(),
  references: z.array(agentContextReferenceSchema).optional(),
});

export type AgentContextReferenceDto = z.infer<typeof agentContextReferenceSchema>;
export type AgentContextFileDto = z.infer<typeof agentContextFileSchema>;
export type UpsertAgentContextDto = z.infer<typeof upsertAgentContextSchema>;
