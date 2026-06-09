import {
  brandAssetSchema,
  brandPaletteSchema,
  logoVariantSchema,
} from '@company-os/types';
import { z } from 'zod';

const marketingObjectiveSchema = z.enum([
  'SELL_MORE',
  'GENERATE_LEADS',
  'STRENGTHEN_BRAND',
]);

export const updateBrandBodySchema = z.object({
  brandVoice: z.string().min(10).max(2000).optional(),
  palette: brandPaletteSchema.optional(),
  typography: z.string().max(200).nullable().optional(),
  visualStyle: z.string().max(200).nullable().optional(),
  niche: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  targetAudience: z.string().max(1000).nullable().optional(),
  marketingObjective: marketingObjectiveSchema.nullable().optional(),
  socialNetworks: z.array(z.string()).optional(),
  mainProducts: z.string().max(2000).nullable().optional(),
  differentiators: z.string().max(2000).nullable().optional(),
});

export const updateLogoBodySchema = z.object({
  variant: logoVariantSchema,
  logoStorageKey: z.string().min(1),
});

export const addBrandAssetBodySchema = z.object({
  storageKey: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  mimeType: z.string().max(120).optional(),
});

export const removeBrandAssetParamsSchema = z.object({
  assetId: z.string().min(1),
});

export const brandAssetResponseSchema = brandAssetSchema;
