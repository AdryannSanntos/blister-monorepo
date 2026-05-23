import { z } from 'zod';

export const agentContextReferenceSourceTypeSchema = z.enum([
  'context_source',
  'asset',
  'design_system_profile',
]);

export const agentContextReferenceSchema = z.object({
  sourceType: agentContextReferenceSourceTypeSchema,
  sourceId: z.string().min(1),
  label: z.string().trim().max(200).optional(),
});

export const upsertAgentContextSchema = z.strictObject({
  instructions: z.string().trim().max(10000).optional(),
  notes: z.string().trim().max(5000).optional(),
  references: z.array(agentContextReferenceSchema).default([]),
});

export type UpsertAgentContextDto = z.infer<typeof upsertAgentContextSchema>;
export type AgentContextReferenceDto = z.infer<typeof agentContextReferenceSchema>;
