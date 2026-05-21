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
