import { z } from 'zod';

export const presignedUploadBodySchema = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export const presignedDownloadQuerySchema = z.object({
  key: z.string().min(1),
});
