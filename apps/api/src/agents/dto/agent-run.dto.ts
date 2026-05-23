import { z } from 'zod';

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

export type ExecuteAgentDto = z.infer<typeof executeAgentSchema>;
export type ListAgentRunsDto = z.infer<typeof listAgentRunsSchema>;
export type GetAgentRunDto = z.infer<typeof getAgentRunSchema>;

// --- Context Snapshot ---

export const agentRunContextSnapshotItemSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
  label: z.string().min(1),
  textContent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const agentRunContextSnapshotSchema = z.object({
  runId: z.string().min(1),
  layers: z.record(z.string(), z.unknown()).default({}),
  resolvedSummary: z.string().optional(),
  items: z.array(agentRunContextSnapshotItemSchema).default([]),
});

export type AgentRunContextSnapshotItemDto = z.infer<typeof agentRunContextSnapshotItemSchema>;
export type AgentRunContextSnapshotDto = z.infer<typeof agentRunContextSnapshotSchema>;

// --- Lineage ---

export const agentRunLineageSchema = z.object({
  rootRunId: z.string().min(1).nullable().optional(),
  parentRunId: z.string().min(1).nullable().optional(),
  parentStepId: z.string().min(1).nullable().optional(),
  depth: z.number().int().min(0).default(0),
});

export type AgentRunLineageDto = z.infer<typeof agentRunLineageSchema>;
