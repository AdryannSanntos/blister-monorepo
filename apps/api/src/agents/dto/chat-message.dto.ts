import { z } from 'zod';

export const createMessageSchema = z.strictObject({
  threadId: z.string().min(1),
  content: z.string().trim().min(1).max(20000),
});

export const editMessageAndBranchSchema = z.strictObject({
  threadId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().trim().min(1).max(20000),
});

export const regenerateMessageSchema = z.strictObject({
  threadId: z.string().min(1),
  messageId: z.string().min(1),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
export type EditMessageAndBranchDto = z.infer<typeof editMessageAndBranchSchema>;
export type RegenerateMessageDto = z.infer<typeof regenerateMessageSchema>;
