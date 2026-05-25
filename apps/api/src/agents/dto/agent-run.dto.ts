import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

export const executeAgentSchema = z.strictObject({
  input: z.record(z.string(), z.unknown()).default({}),
});

export const listAgentRunsSchema = z.object({
  agentId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  onlyOwnRuns: z.coerce.boolean().optional().default(false),
});

export const getAgentRunSchema = z.object({
  onlyOwnRuns: z.coerce.boolean().optional().default(false),
});

export const agentRunContextSnapshotItemSchema = z.strictObject({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  label: z.string().min(1),
  content: z.string().optional(),
  summary: z.string().optional(),
  metadata: jsonObjectSchema.optional(),
});

export const agentRunContextSnapshotSchema = z.strictObject({
  runId: z.string().min(1),
  layers: z
    .strictObject({
      company: jsonObjectSchema.optional(),
      agent: jsonObjectSchema.optional(),
      runtime: jsonObjectSchema.optional(),
    })
    .default({}),
  resolvedSummary: z.string().optional(),
  metadata: jsonObjectSchema.optional(),
  items: z.array(agentRunContextSnapshotItemSchema).default([]),
});

export const agentRunLineageSchema = z.strictObject({
  rootRunId: z.string().min(1).nullable().optional(),
  parentRunId: z.string().min(1).nullable().optional(),
  parentStepId: z.string().min(1).nullable().optional(),
  depth: z.int().nonnegative().default(0),
});

export type ExecuteAgentDto = z.infer<typeof executeAgentSchema>;
export type ListAgentRunsDto = z.infer<typeof listAgentRunsSchema>;
export type GetAgentRunDto = z.infer<typeof getAgentRunSchema>;
export type AgentRunContextSnapshotDto = z.infer<typeof agentRunContextSnapshotSchema>;
export type AgentRunLineageDto = z.infer<typeof agentRunLineageSchema>;
