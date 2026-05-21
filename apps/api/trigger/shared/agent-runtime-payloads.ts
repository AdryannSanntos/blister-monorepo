import { z } from 'zod';

export const agentRunTaskPayloadSchema = z.object({
  organizationId: z.string().min(1),
  agentRunId: z.string().min(1),
  agentId: z.string().min(1),
  agentVersionId: z.string().min(1),
});

export type AgentRunTaskPayload = z.infer<typeof agentRunTaskPayloadSchema>;
