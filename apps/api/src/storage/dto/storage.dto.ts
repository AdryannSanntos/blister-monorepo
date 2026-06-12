import { z } from 'zod';
import { MAX_PRESIGNED_UPLOAD_BYTES } from '@company-os/types';

export const presignedUploadBodySchema = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_PRESIGNED_UPLOAD_BYTES),
});

export const presignedDownloadQuerySchema = z.object({
  key: z.string().min(1),
});
