import { z } from 'zod';

export const createContextUploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1),
  size: z.number().int().positive().max(100 * 1024 * 1024),
});

export type CreateContextUploadUrlDto = z.infer<typeof createContextUploadUrlSchema>;
