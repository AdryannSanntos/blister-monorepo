import { z } from 'zod';

import { brandPaletteSchema } from './brand-palette';
import {
  brandAssetsSchema,
  logoVariantSchema,
  logoVariantsSchema,
} from './brand-visual';

export const presignedUploadRequestSchema = z.object({
  key: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type PresignedUploadRequest = z.infer<typeof presignedUploadRequestSchema>;

export const presignedUploadResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  expiresIn: z.number(),
});
export type PresignedUploadResponse = z.infer<typeof presignedUploadResponseSchema>;

export const fileUploadResponseSchema = z.object({
  key: z.string(),
});
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;

export const companyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  onboardingCompletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CompanyResponse = z.infer<typeof companyResponseSchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(120),
});
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;

export const marketingObjectiveValues = [
  'SELL_MORE',
  'GENERATE_LEADS',
  'STRENGTHEN_BRAND',
] as const;
export const marketingObjectiveSchema = z.enum(marketingObjectiveValues);
export type MarketingObjective = z.infer<typeof marketingObjectiveSchema>;

export const socialNetworkValues = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'youtube',
  'whatsapp',
] as const;
export const socialNetworkSchema = z.enum(socialNetworkValues);
export type SocialNetwork = z.infer<typeof socialNetworkSchema>;

export const visualStyleValues = [
  'minimal',
  'modern',
  'traditional',
  'bold',
  'elegant',
] as const;
export const visualStyleSchema = z.enum(visualStyleValues);
export type VisualStyle = z.infer<typeof visualStyleSchema>;

export const onboardingSchema = z.object({
  companyName: z.string().min(2).max(120),
  niche: z.string().min(2).max(200),
  description: z.string().min(10).max(500),
  brandVoice: z.string().min(10).max(2000),
  logoStorageKey: z.string().optional(),
  createNew: z.boolean().optional(),
});
export type OnboardingDto = z.infer<typeof onboardingSchema>;

export const brandProfileResponseSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  logoStorageKey: z.string().nullable(),
  logoVariants: logoVariantsSchema,
  brandAssets: brandAssetsSchema,
  brandVoice: z.string(),
  palette: brandPaletteSchema,
  typography: z.string().nullable(),
  visualStyle: z.string().nullable(),
  niche: z.string().nullable(),
  description: z.string().nullable(),
  targetAudience: z.string().nullable(),
  marketingObjective: marketingObjectiveSchema.nullable(),
  socialNetworks: z.array(z.string()),
  mainProducts: z.string().nullable(),
  differentiators: z.string().nullable(),
  updatedAt: z.string(),
});
export type BrandProfileResponse = z.infer<typeof brandProfileResponseSchema>;

export const updateBrandProfileSchema = z.object({
  brandVoice: z.string().min(10).max(2000).optional(),
  palette: brandPaletteSchema.optional(),
  typography: z.string().max(200).optional().nullable(),
  visualStyle: z.string().max(200).optional().nullable(),
  niche: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  targetAudience: z.string().max(1000).optional().nullable(),
  marketingObjective: marketingObjectiveSchema.nullable().optional(),
  socialNetworks: z.array(z.string()).optional(),
  mainProducts: z.string().max(2000).optional().nullable(),
  differentiators: z.string().max(2000).optional().nullable(),
});
export type UpdateBrandProfileDto = z.infer<typeof updateBrandProfileSchema>;

export const updateLogoSchema = z.object({
  variant: logoVariantSchema,
  logoStorageKey: z.string().min(1),
});
export type UpdateLogoDto = z.infer<typeof updateLogoSchema>;

export const addBrandAssetSchema = z.object({
  storageKey: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  mimeType: z.string().max(120).optional(),
});
export type AddBrandAssetDto = z.infer<typeof addBrandAssetSchema>;

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const homeDestinationSchema = z.enum([
  'onboarding',
  'dashboard',
  'workspaces',
]);
export type HomeDestination = z.infer<typeof homeDestinationSchema>;

export const homeDestinationResponseSchema = z.object({
  destination: homeDestinationSchema,
  companyCount: z.number().int().nonnegative(),
  onboardedCount: z.number().int().nonnegative(),
});
export type HomeDestinationResponse = z.infer<
  typeof homeDestinationResponseSchema
>;

export const companyListItemSchema = companyResponseSchema;
export type CompanyListItem = z.infer<typeof companyListItemSchema>;
