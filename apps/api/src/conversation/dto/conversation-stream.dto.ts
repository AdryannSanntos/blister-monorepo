import { z } from 'zod';

/**
 * Request body accepted by a conversational stream endpoint. Surface-specific
 * controllers (e.g. agent chat) extend the scoping (orgId/agentId come from the
 * route, userId from the session — never from the body, per project rules).
 */
export const startConversationStreamSchema = z.object({
  content: z.string().min(1).max(20000),
  attachments: z
    .array(
      z.object({
        kind: z.enum(['image', 'file']),
        url: z.string(),
        name: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    )
    .optional(),
  /**
   * Resume support: when reconnecting, the client passes the last sequence it has
   * already applied so the server can replay only newer events. Mirrors the SSE
   * `Last-Event-ID` header.
   */
  lastEventId: z.number().int().nonnegative().optional(),
});

export type StartConversationStreamInput = z.infer<typeof startConversationStreamSchema>;
