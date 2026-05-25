import { z } from 'zod';

export const orchestrationModeSchema = z.enum(['conversation', 'context_retrieval', 'execution']);

export const orchestrationEventSchema = z.object({
  type: z.enum(['intent_classified', 'context_loaded', 'context_read', 'execution_decided']),
  label: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const orchestrateMessageInputSchema = z.object({
  organizationId: z.string().min(1),
  agentId: z.string().min(1),
  userId: z.string().min(1),
  message: z.string().min(1),
  threadId: z.string().optional(),
});

export const agentChatTurnDecisionSchema = z.object({
  createRun: z.boolean(),
  assistantMessage: z.string().min(1),
  executionReason: z.string().optional(),
  events: z
    .array(
      z.object({
        type: orchestrationEventSchema.shape.type,
        label: z.string().min(1),
      }),
    )
    .min(1),
});

export const orchestrationResultSchema = z.object({
  mode: orchestrationModeSchema,
  createRun: z.boolean(),
  assistantMessage: z.string().min(1),
  events: z.array(orchestrationEventSchema),
  resolvedContextHints: z.array(z.string()),
  executionReason: z.string().optional(),
});

export type OrchestrateMessageInput = z.infer<typeof orchestrateMessageInputSchema>;
export type OrchestrationResult = z.infer<typeof orchestrationResultSchema>;
export type OrchestrationMode = z.infer<typeof orchestrationModeSchema>;
export type OrchestrationEvent = z.infer<typeof orchestrationEventSchema>;
export type AgentChatTurnDecision = z.infer<typeof agentChatTurnDecisionSchema>;
