import { z } from 'zod';

export const designAssetRoleSchema = z.enum([
  'logo',
  'logo-variation',
  'brand-guideline',
  'color-reference',
  'typography-reference',
  'visual-reference',
  'campaign-reference',
  'product-visual',
  'iconography',
  'template',
  'context-reference',
  'other',
]);

export const createDesignAssetSchema = z.object({
  primaryRole: designAssetRoleSchema,
  secondaryTags: z.array(z.string().trim().min(1)).default([]),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  objectKey: z.string().trim().min(1),
  publicUrl: z.string().trim().url().optional().nullable(),
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  size: z.coerce.number().int().nonnegative(),
});

export type CreateDesignAssetDto = z.infer<typeof createDesignAssetSchema>;
