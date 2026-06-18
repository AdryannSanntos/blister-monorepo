import { z } from 'zod';

// ---------------------------------------------------------------------------
// Agent Status (aligned with Prisma schema)
// ---------------------------------------------------------------------------

export const agentRunStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const agentRunStepStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
]);

export const stepResultTypeSchema = z.enum([
  'CONTINUE',
  'PAUSED',
  'FAILED',
  'COMPLETE',
]);

// ---------------------------------------------------------------------------
// Review Status (for AgentRun)
// ---------------------------------------------------------------------------

export const reviewStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EDITED',
]);

export const reviewActionSchema = z.enum([
  'approve',
  'reject',
  'edit',
  'regenerate',
]);

// ---------------------------------------------------------------------------
// Agent Definition (contract per agent)
// ---------------------------------------------------------------------------

export const agentCapabilitySchema = z.enum([
  'text_generation',
  'image_generation',
  'strategy',
  'planning',
  'analysis',
]);

export const agentDefinitionSchema = z.object({
  agentId: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  capabilities: z.array(agentCapabilitySchema).default([]),
  inputSchema: z.any(),
  outputSchema: z.any(),
  reviewSchema: z.any().optional(),
  steps: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['llm_call', 'validation', 'form', 'decision', 'output']),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  isEnabled: z.boolean().default(true),
  estimatedCreditCost: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Run Agent Request
// ---------------------------------------------------------------------------

export const runAgentRequestSchema = z.object({
  userInput: z.string().trim().min(1).max(10_000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Resume Agent Request
// ---------------------------------------------------------------------------

export const resumeAgentRequestSchema = z.object({
  formData: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export { reviewCutsSchema, type ReviewCutsDto } from './agents/cuts';

// ---------------------------------------------------------------------------
// Agent Run Status DTO
// ---------------------------------------------------------------------------

export const agentRunStatusDtoSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  companyId: z.string(),
  campaignId: z.string().nullable(),
  status: agentRunStatusSchema,
  currentStepKey: z.string().nullable(),
  inputPayload: z.record(z.string(), z.unknown()),
  outputPayload: z.record(z.string(), z.unknown()),
  errorMessage: z.string().nullable(),
  pauseReason: z.string().nullable(),
  pauseFormSchema: z.any().nullable(),
  reviewStatus: reviewStatusSchema.nullable(),
  creditCost: z.number().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Agent Run Step DTO
// ---------------------------------------------------------------------------

export const agentRunStepDtoSchema = z.object({
  id: z.string(),
  stepKey: z.string(),
  stepIndex: z.number(),
  status: agentRunStepStatusSchema,
  resultType: stepResultTypeSchema.nullable(),
  inputPayload: z.record(z.string(), z.unknown()),
  outputPayload: z.record(z.string(), z.unknown()),
  errorMessage: z.string().nullable(),
  llmModel: z.string().nullable(),
  tokensInput: z.number().nullable(),
  tokensOutput: z.number().nullable(),
  creditCost: z.number().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Review Agent Run DTOs
// ---------------------------------------------------------------------------

export const approveAgentRunSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const rejectAgentRunSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const editAgentRunOutputSchema = z.object({
  editedOutput: z.record(z.string(), z.unknown()),
  reason: z.string().max(1000).optional(),
});

export const regenerateAgentRunSchema = z.object({
  userInput: z.string().trim().min(1).max(10_000).optional(),
  instruction: z.string().trim().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Step Context (internal runtime)
// ---------------------------------------------------------------------------

export const stepContextSchema = z.object({
  runId: z.string(),
  agentId: z.string(),
  companyId: z.string(),
  stepKey: z.string(),
  stepIndex: z.number(),
  inputPayload: z.record(z.string(), z.unknown()),
  previousStepsOutput: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export const stepResultSchema = z.object({
  type: stepResultTypeSchema,
  output: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  pauseReason: z.string().optional(),
  pauseFormSchema: z.any().optional(),
  llmModel: z.string().optional(),
  tokensInput: z.number().optional(),
  tokensOutput: z.number().optional(),
  creditCost: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Agent List DTO (for admin catalog)
// ---------------------------------------------------------------------------

export const agentCatalogItemSchema = z.object({
  agentId: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  capabilities: z.array(agentCapabilitySchema),
  isEnabled: z.boolean(),
  estimatedCreditCost: z.number().nullable(),
  sortOrder: z.number(),
});

export const agentCatalogSchema = z.object({
  agents: z.array(agentCatalogItemSchema),
  total: z.number(),
});

// ---------------------------------------------------------------------------
// SSE Event Types
// ---------------------------------------------------------------------------

export const agentRunEventTypeSchema = z.enum([
  'run_started',
  'run_paused',
  'run_completed',
  'run_failed',
  'run_cancelled',
  // legacy (no longer consumed by the chat UI; kept for compatibility)
  'step_started',
  'step_completed',
  'step_failed',
  'output_chunk',
  // block protocol
  'message_start',
  'block_start',
  'block_delta',
  'block_end',
  'message_end',
  // cuts progressive rendering
  'cut_rendered',
  'all_cuts_rendered',
]);

export const blockTypeSchema = z.enum([
  'thinking',
  'searching_context',
  'planning',
  'working',
  'text',
  'form_question',
  'output',
  'error',
]);

export const agentRunBlockRoleSchema = z.enum(['user', 'assistant']);
export const agentRunBlockStatusSchema = z.enum(['streaming', 'complete', 'error']);

export const messageStartEventDataSchema = z.object({
  messageId: z.string(),
  role: agentRunBlockRoleSchema,
});
export const blockStartEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  blockType: blockTypeSchema,
  index: z.number().int().nonnegative(),
  label: z.string().optional(),
  stepKey: z.string().optional(),
});
export const blockDeltaEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  delta: z.string(),
});
export const blockEndEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  status: agentRunBlockStatusSchema,
  payload: z.record(z.string(), z.unknown()).optional(),
});
export const messageEndEventDataSchema = z.object({ messageId: z.string() });

export const agentRunBlockDtoSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  role: agentRunBlockRoleSchema,
  blockType: blockTypeSchema,
  index: z.number().int(),
  label: z.string().nullable(),
  text: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  stepKey: z.string().nullable(),
  status: agentRunBlockStatusSchema,
  createdAt: z.string(),
});

export const agentRunEventSchema = z.object({
  type: agentRunEventTypeSchema,
  runId: z.string(),
  timestamp: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentRunStepStatus = z.infer<typeof agentRunStepStatusSchema>;
export type StepResultType = z.infer<typeof stepResultTypeSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;
export type AgentCapability = z.infer<typeof agentCapabilitySchema>;
export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;
export type RunAgentRequest = z.infer<typeof runAgentRequestSchema>;
export type ResumeAgentRequest = z.infer<typeof resumeAgentRequestSchema>;
export type AgentRunStatusDto = z.infer<typeof agentRunStatusDtoSchema>;
export type AgentRunStepDto = z.infer<typeof agentRunStepDtoSchema>;
export type ApproveAgentRunDto = z.infer<typeof approveAgentRunSchema>;
export type RejectAgentRunDto = z.infer<typeof rejectAgentRunSchema>;
export type EditAgentRunOutputDto = z.infer<typeof editAgentRunOutputSchema>;
export type RegenerateAgentRunDto = z.infer<typeof regenerateAgentRunSchema>;
export type StepContext = z.infer<typeof stepContextSchema>;
export type StepResult = z.infer<typeof stepResultSchema>;
export type AgentCatalogItem = z.infer<typeof agentCatalogItemSchema>;
export type AgentCatalog = z.infer<typeof agentCatalogSchema>;
export type AgentRunEventType = z.infer<typeof agentRunEventTypeSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;
export type AgentRunBlockRole = z.infer<typeof agentRunBlockRoleSchema>;
export type AgentRunBlockStatus = z.infer<typeof agentRunBlockStatusSchema>;
export type AgentRunBlockDto = z.infer<typeof agentRunBlockDtoSchema>;
export type MessageStartEventData = z.infer<typeof messageStartEventDataSchema>;
export type BlockStartEventData = z.infer<typeof blockStartEventDataSchema>;
export type BlockDeltaEventData = z.infer<typeof blockDeltaEventDataSchema>;
export type BlockEndEventData = z.infer<typeof blockEndEventDataSchema>;
export type MessageEndEventData = z.infer<typeof messageEndEventDataSchema>;
export type AgentRunEvent = z.infer<typeof agentRunEventSchema>;
