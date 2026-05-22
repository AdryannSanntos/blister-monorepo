import { z } from 'zod';

export const chatThreadScopeSchema = z.enum(['company_chat', 'agent_chat']);

export const createThreadSchema = z
  .strictObject({
    scope: chatThreadScopeSchema,
    agentId: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(160).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'agent_chat' && !value.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agentId'],
        message: 'agentId is required for agent_chat threads',
      });
    }

    if (value.scope === 'company_chat' && value.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agentId'],
        message: 'agentId is not allowed for company_chat threads',
      });
    }
  });

export const listThreadsSchema = z.strictObject({
  scope: chatThreadScopeSchema.optional(),
  agentId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
export type ListThreadsDto = z.infer<typeof listThreadsSchema>;
