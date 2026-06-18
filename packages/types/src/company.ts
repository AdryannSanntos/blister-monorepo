import { z } from 'zod';

/** Max size for workspace video uploads via presigned URL (5 GB). */
export const MAX_PRESIGNED_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

export const presignedUploadRequestSchema = z.object({
  key: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_PRESIGNED_UPLOAD_BYTES),
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

export const visualStyleValues = ['minimal', 'modern', 'traditional', 'bold', 'elegant'] as const;
export const visualStyleSchema = z.enum(visualStyleValues);
export type VisualStyle = z.infer<typeof visualStyleSchema>;

// Onboarding mínimo: empresa = nome (+ objetivo opcional). Demais campos da
// marca ficam opcionais e podem ser preenchidos depois nas Configurações.
export const onboardingSchema = z.object({
  companyName: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  niche: z.string().max(200).optional(),
  brandVoice: z.string().max(2000).optional(),
  logoStorageKey: z.string().optional(),
  createNew: z.boolean().optional(),
});
export type OnboardingDto = z.infer<typeof onboardingSchema>;

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const homeDestinationSchema = z.enum(['onboarding', 'dashboard', 'workspaces']);
export type HomeDestination = z.infer<typeof homeDestinationSchema>;

export const homeDestinationResponseSchema = z.object({
  destination: homeDestinationSchema,
  companyCount: z.number().int().nonnegative(),
  onboardedCount: z.number().int().nonnegative(),
});
export type HomeDestinationResponse = z.infer<typeof homeDestinationResponseSchema>;

export const companyListItemSchema = companyResponseSchema;
export type CompanyListItem = z.infer<typeof companyListItemSchema>;
