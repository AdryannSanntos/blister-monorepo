import { z } from 'zod';
import { designAssetRoleSchema } from './create-design-asset.dto';

export const createUploadUrlSchema = z.object({
  assetId: z.string().trim().min(1),
  primaryRole: designAssetRoleSchema,
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  size: z.coerce.number().int().positive(),
});

export type CreateUploadUrlDto = z.infer<typeof createUploadUrlSchema>;
