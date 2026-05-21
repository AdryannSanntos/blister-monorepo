import { z } from 'zod';
import { assetRelationSchema } from './create-asset.dto';

export const bulkAssetActionSchema = z.enum([
  'archive',
  'mark_obsolete',
  'approve_context',
  'discard_context',
  'promote_to_context',
  'replace_relations',
]);

export const bulkUpdateAssetsSchema = z
  .object({
    assetIds: z.array(z.string().min(1)).min(1),
    action: bulkAssetActionSchema,
    relations: z.array(assetRelationSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'replace_relations' && !value.relations?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relations'],
        message: 'relations are required for replace_relations',
      });
    }
  });

export type BulkUpdateAssetsDto = z.infer<typeof bulkUpdateAssetsSchema>;
