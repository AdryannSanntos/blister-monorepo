import { z } from 'zod';
import {
  assetRoleFilterSchema,
  contextAssetStatusSchema,
  operationalAssetStatusSchema,
} from './create-asset.dto';

export const listAssetsSchema = z.object({
  role: assetRoleFilterSchema.default('all'),
  search: z.string().trim().optional(),
  contextStatus: contextAssetStatusSchema.optional(),
  operationalStatus: operationalAssetStatusSchema.optional(),
});

export type ListAssetsDto = z.infer<typeof listAssetsSchema>;
