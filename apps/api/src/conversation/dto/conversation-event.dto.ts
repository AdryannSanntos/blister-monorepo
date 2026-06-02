import { z } from 'zod';

/**
 * Canonical conversation event contract shared by `agent chat` (and, later, other
 * conversational surfaces). Every event persisted to `ConversationEvent` and every
 * SSE frame MUST validate against `conversationEventSchema`.
 *
 * The schema is a discriminated union on `eventType`: each event type carries a
 * strictly-typed payload. This is intentional — a malformed payload (missing
 * `delta`, a tool event without `toolCallId`, citations that are not an array)
 * must fail validation at the boundary instead of corrupting a projection.
 */

export const conversationEventTypeSchema = z.enum([
  'message_created',
  'message_stream_started',
  'message_text_delta',
  'message_text_snapshot',
  'message_completed',
  'message_failed',
  'tool_group_started',
  'tool_started',
  'tool_progress',
  'tool_completed',
  'tool_failed',
  'citations_emitted',
  'context_search_started',
  'context_search_completed',
  'file_search_started',
  'file_search_completed',
  'web_research_started',
  'web_research_completed',
]);

export const conversationMessageStatusSchema = z.enum([
  'pending',
  'streaming',
  'completed',
  'failed',
]);

export const conversationToolStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

/** Reuses the established citation shape from the agent tool contract. */
export const conversationCitationSchema = z.object({
  label: z.string().min(1),
  url: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

const jsonRecord = z.record(z.string(), z.unknown());

/**
 * Per-event payloads. Kept flat and explicit so a producer cannot emit, e.g., a
 * `message_text_delta` without a non-empty `delta`.
 */
export const messageCreatedPayloadSchema = z.object({
  role: z.literal('assistant').default('assistant'),
});
export const messageStreamStartedPayloadSchema = z.object({}).strict();
export const messageTextDeltaPayloadSchema = z.object({ delta: z.string().min(1) });
export const messageTextSnapshotPayloadSchema = z.object({ text: z.string() });
export const messageCompletedPayloadSchema = z.object({
  text: z.string(),
  citations: z.array(conversationCitationSchema).default([]),
});
export const messageFailedPayloadSchema = z.object({ errorMessage: z.string().min(1) });

export const toolGroupStartedPayloadSchema = z.object({
  groupId: z.string().min(1),
  label: z.string().min(1),
});
export const toolStartedPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  groupId: z.string().optional(),
  label: z.string().optional(),
  input: jsonRecord.default({}),
  displayOrder: z.number().int().nonnegative().default(0),
});
export const toolProgressPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  note: z.string().optional(),
  progress: z.number().min(0).max(1).optional(),
});
export const toolCompletedPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  output: jsonRecord.default({}),
  resultCount: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});
export const toolFailedPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  errorMessage: z.string().min(1),
  durationMs: z.number().int().nonnegative().optional(),
});

export const citationsEmittedPayloadSchema = z.object({
  citations: z.array(conversationCitationSchema).min(1),
});

const searchStartedPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  query: z.string().min(1),
});
const searchCompletedPayloadSchema = z.object({
  toolCallId: z.string().min(1),
  resultCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().optional(),
});

/**
 * Discriminated union over the full event contract. Validating an event here
 * guarantees the projection layer always receives well-formed payloads.
 */
export const conversationEventSchema = z.discriminatedUnion('eventType', [
  z.object({ eventType: z.literal('message_created'), payload: messageCreatedPayloadSchema }),
  z.object({
    eventType: z.literal('message_stream_started'),
    payload: messageStreamStartedPayloadSchema,
  }),
  z.object({ eventType: z.literal('message_text_delta'), payload: messageTextDeltaPayloadSchema }),
  z.object({
    eventType: z.literal('message_text_snapshot'),
    payload: messageTextSnapshotPayloadSchema,
  }),
  z.object({ eventType: z.literal('message_completed'), payload: messageCompletedPayloadSchema }),
  z.object({ eventType: z.literal('message_failed'), payload: messageFailedPayloadSchema }),
  z.object({ eventType: z.literal('tool_group_started'), payload: toolGroupStartedPayloadSchema }),
  z.object({ eventType: z.literal('tool_started'), payload: toolStartedPayloadSchema }),
  z.object({ eventType: z.literal('tool_progress'), payload: toolProgressPayloadSchema }),
  z.object({ eventType: z.literal('tool_completed'), payload: toolCompletedPayloadSchema }),
  z.object({ eventType: z.literal('tool_failed'), payload: toolFailedPayloadSchema }),
  z.object({ eventType: z.literal('citations_emitted'), payload: citationsEmittedPayloadSchema }),
  z.object({ eventType: z.literal('context_search_started'), payload: searchStartedPayloadSchema }),
  z.object({
    eventType: z.literal('context_search_completed'),
    payload: searchCompletedPayloadSchema,
  }),
  z.object({ eventType: z.literal('file_search_started'), payload: searchStartedPayloadSchema }),
  z.object({
    eventType: z.literal('file_search_completed'),
    payload: searchCompletedPayloadSchema,
  }),
  z.object({ eventType: z.literal('web_research_started'), payload: searchStartedPayloadSchema }),
  z.object({
    eventType: z.literal('web_research_completed'),
    payload: searchCompletedPayloadSchema,
  }),
]);

/** Input accepted by the event store when appending a new event. */
export const appendConversationEventInputSchema = z
  .object({
    organizationId: z.string().min(1),
    threadId: z.string().min(1),
    messageId: z.string().min(1),
    /** Optional natural key for idempotent appends; retried producers reuse it. */
    idempotencyKey: z.string().min(1).optional(),
  })
  .and(conversationEventSchema);

/**
 * Canonical SSE frame. Every streamed event carries thread/message/sequence so the
 * client can dedupe, order, and resume from the last known `sequence`.
 */
export const conversationSseFrameSchema = z.object({
  event: conversationEventTypeSchema,
  id: z.string().min(1),
  threadId: z.string().min(1),
  messageId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  data: z.unknown(),
});

export type ConversationEventType = z.infer<typeof conversationEventTypeSchema>;
export type ConversationMessageStatus = z.infer<typeof conversationMessageStatusSchema>;
export type ConversationToolStatus = z.infer<typeof conversationToolStatusSchema>;
export type ConversationCitation = z.infer<typeof conversationCitationSchema>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;
export type AppendConversationEventInput = z.infer<typeof appendConversationEventInputSchema>;
export type ConversationSseFrame = z.infer<typeof conversationSseFrameSchema>;
