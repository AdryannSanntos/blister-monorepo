import { z } from 'zod';
import {
  assetRelationSchema,
  contextAssetStatusSchema,
  operationalAssetStatusSchema,
} from './create-asset.dto';

export const updateAssetSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    visibleType: z.string().trim().min(1).optional(),
    visibleCategory: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    contextRole: z.boolean().optional(),
    operationalRole: z.boolean().optional(),
    contextStatus: contextAssetStatusSchema.optional(),
    operationalStatus: operationalAssetStatusSchema.optional(),
    relations: z.array(assetRelationSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateAssetDto = z.infer<typeof updateAssetSchema>;
