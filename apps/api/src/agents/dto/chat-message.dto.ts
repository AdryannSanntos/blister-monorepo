import { z } from 'zod';

export const createMessageAttachmentSchema = z.strictObject({
  id: z.string().min(1).max(120),
  filename: z.string().trim().min(1).max(260),
  contentType: z.string().trim().min(1).max(120),
  size: z.number().int().min(0).max(20_000_000).optional(),
  url: z.string().trim().min(1).max(10_000_000).optional(),
  textContent: z.string().trim().min(1).max(50_000).optional(),
});

export const createMessageSchema = z.strictObject({
  threadId: z.string().min(1),
  content: z.string().trim().min(1).max(20000),
  attachments: z.array(createMessageAttachmentSchema).max(6).optional(),
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
