import { z } from 'zod';

/**
 * Canonical phase-1 read-only tools available to the conversational chat runtime.
 * Keep in sync with `agentAllowedToolSchema` in `agent.dto.ts` and the frontend
 * tool allowlist type.
 */
export const agentChatToolNameSchema = z.enum(['rag_search', 'file_search', 'web_research']);

export const agentToolCitationSchema = z.object({
  label: z.string(),
  url: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

/**
 * Unified envelope every tool executor must converge to. The orchestrator never
 * inspects executor internals beyond this normalized contract.
 */
export const agentToolResultSchema = z.object({
  toolName: agentChatToolNameSchema,
  summary: z.string(),
  results: z.array(z.record(z.string(), z.unknown())),
  citations: z.array(agentToolCitationSchema),
  metadata: z.object({
    durationMs: z.number().int().nonnegative(),
    resultCount: z.number().int().nonnegative(),
    truncated: z.boolean().optional(),
  }),
});

/** Lifecycle states for a tool call — ready for future approval-gated tools. */
export const agentChatToolStatusSchema = z.enum([
  'completed',
  'error',
  'awaiting_approval',
  'rejected',
]);

export type AgentChatToolName = z.infer<typeof agentChatToolNameSchema>;
export type AgentToolCitation = z.infer<typeof agentToolCitationSchema>;
export type AgentToolResult = z.infer<typeof agentToolResultSchema>;
export type AgentChatToolStatus = z.infer<typeof agentChatToolStatusSchema>;
