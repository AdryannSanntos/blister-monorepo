import { z } from 'zod';
import { agentChatToolNameSchema, agentChatToolStatusSchema } from './agent-chat-tool.dto';

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

/**
 * Single structured decision used by the conversational tool loop. Each turn the
 * model either calls one tool or responds. Flat shape keeps it compatible with
 * strict structured-output JSON schemas.
 */
export const agentChatToolLoopDecisionSchema = z.object({
  action: z.enum(['respond', 'tool_call']),
  assistantMessage: z.string(),
  createRun: z.boolean(),
  executionReason: z.string(),
  toolName: z.enum(['rag_search', 'file_search', 'web_research', 'none']),
  toolQuery: z.string(),
  events: z
    .array(
      z.object({
        type: orchestrationEventSchema.shape.type,
        label: z.string().min(1),
      }),
    )
    .default([]),
});

/** UI projection of one tool call, consumed by the frontend `ToolRenderer`. */
export const orchestrationToolPartSchema = z.object({
  type: z.string(),
  toolCallId: z.string(),
  state: z.enum(['input-streaming', 'output-available', 'output-error']),
  input: z.record(z.string(), z.unknown()),
  output: z.unknown(),
});

/** Operational audit projection persisted to `AgentChatToolCall`. */
export const orchestrationToolCallSchema = z.object({
  toolName: agentChatToolNameSchema,
  status: agentChatToolStatusSchema,
  inputPayload: z.record(z.string(), z.unknown()),
  outputPayload: z.record(z.string(), z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
});

export const orchestrationCitationSchema = z.object({
  label: z.string(),
  url: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

export const orchestrationResultSchema = z.object({
  mode: orchestrationModeSchema,
  createRun: z.boolean(),
  assistantMessage: z.string().min(1),
  events: z.array(orchestrationEventSchema),
  resolvedContextHints: z.array(z.string()),
  executionReason: z.string().optional(),
  toolParts: z.array(orchestrationToolPartSchema).default([]),
  citations: z.array(orchestrationCitationSchema).default([]),
  toolCalls: z.array(orchestrationToolCallSchema).default([]),
});

export type OrchestrateMessageInput = z.infer<typeof orchestrateMessageInputSchema>;
export type OrchestrationResult = z.infer<typeof orchestrationResultSchema>;
export type OrchestrationMode = z.infer<typeof orchestrationModeSchema>;
export type OrchestrationEvent = z.infer<typeof orchestrationEventSchema>;
export type AgentChatTurnDecision = z.infer<typeof agentChatTurnDecisionSchema>;
export type AgentChatToolLoopDecision = z.infer<typeof agentChatToolLoopDecisionSchema>;
export type OrchestrationToolPart = z.infer<typeof orchestrationToolPartSchema>;
export type OrchestrationToolCall = z.infer<typeof orchestrationToolCallSchema>;
export type OrchestrationCitation = z.infer<typeof orchestrationCitationSchema>;
