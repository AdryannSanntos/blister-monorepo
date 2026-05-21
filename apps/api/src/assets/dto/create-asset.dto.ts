import { z } from 'zod';

export const assetSourceKindSchema = z.enum(['file', 'url']);
export const assetRoleFilterSchema = z.enum(['all', 'context', 'operational']);
export const contextAssetStatusSchema = z.enum([
  'uploaded',
  'processed',
  'suggested',
  'approved',
  'discarded',
]);
export const operationalAssetStatusSchema = z.enum(['active', 'archived', 'obsolete']);
export const assetRelationKindSchema = z.enum(['campaign', 'channel', 'product', 'page', 'output']);

export const assetRelationSchema = z.object({
  kind: assetRelationKindSchema,
  value: z.string().trim().min(1),
});

export const createAssetSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    description: z.string().trim().optional(),
    sourceKind: assetSourceKindSchema,
    sourceUrl: z.string().trim().url().optional(),
    fileName: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    visibleType: z.string().trim().min(1).optional(),
    visibleCategory: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    contextRole: z.boolean().default(false),
    operationalRole: z.boolean().default(true),
    relations: z.array(assetRelationSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.sourceKind === 'url' && !value.sourceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceUrl'],
        message: 'sourceUrl is required when sourceKind is url',
      });
    }

    if (value.sourceKind === 'file' && !value.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fileName'],
        message: 'fileName is required when sourceKind is file',
      });
    }

    if (!value.contextRole && !value.operationalRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contextRole'],
        message: 'at least one asset role must be enabled',
      });
    }
  });

export type CreateAssetDto = z.infer<typeof createAssetSchema>;
