"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyListItemSchema = exports.homeDestinationResponseSchema = exports.homeDestinationSchema = exports.onboardingStatusSchema = exports.addBrandAssetSchema = exports.updateLogoSchema = exports.updateBrandProfileSchema = exports.brandProfileResponseSchema = exports.onboardingSchema = exports.visualStyleSchema = exports.visualStyleValues = exports.socialNetworkSchema = exports.socialNetworkValues = exports.marketingObjectiveSchema = exports.marketingObjectiveValues = exports.updateCompanySchema = exports.companyResponseSchema = exports.fileUploadResponseSchema = exports.presignedUploadResponseSchema = exports.presignedUploadRequestSchema = exports.MAX_PRESIGNED_UPLOAD_BYTES = void 0;
const zod_1 = require("zod");
const brand_palette_1 = require("./brand-palette");
const brand_visual_1 = require("./brand-visual");
/** Max size for workspace video uploads via presigned URL (5 GB). */
exports.MAX_PRESIGNED_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
exports.presignedUploadRequestSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().positive().max(exports.MAX_PRESIGNED_UPLOAD_BYTES),
});
exports.presignedUploadResponseSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    key: zod_1.z.string(),
    expiresIn: zod_1.z.number(),
});
exports.fileUploadResponseSchema = zod_1.z.object({
    key: zod_1.z.string(),
});
exports.companyResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    onboardingCompletedAt: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.updateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
});
exports.marketingObjectiveValues = [
    'SELL_MORE',
    'GENERATE_LEADS',
    'STRENGTHEN_BRAND',
];
exports.marketingObjectiveSchema = zod_1.z.enum(exports.marketingObjectiveValues);
exports.socialNetworkValues = [
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'youtube',
    'whatsapp',
];
exports.socialNetworkSchema = zod_1.z.enum(exports.socialNetworkValues);
exports.visualStyleValues = [
    'minimal',
    'modern',
    'traditional',
    'bold',
    'elegant',
];
exports.visualStyleSchema = zod_1.z.enum(exports.visualStyleValues);
exports.onboardingSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2).max(120),
    niche: zod_1.z.string().min(2).max(200),
    description: zod_1.z.string().min(10).max(500),
    brandVoice: zod_1.z.string().min(10).max(2000),
    logoStorageKey: zod_1.z.string().optional(),
    createNew: zod_1.z.boolean().optional(),
});
exports.brandProfileResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    companyId: zod_1.z.string(),
    logoStorageKey: zod_1.z.string().nullable(),
    logoVariants: brand_visual_1.logoVariantsSchema,
    brandAssets: brand_visual_1.brandAssetsSchema,
    brandVoice: zod_1.z.string(),
    palette: brand_palette_1.brandPaletteSchema,
    typography: zod_1.z.string().nullable(),
    visualStyle: zod_1.z.string().nullable(),
    niche: zod_1.z.string().nullable(),
    description: zod_1.z.string().nullable(),
    targetAudience: zod_1.z.string().nullable(),
    marketingObjective: exports.marketingObjectiveSchema.nullable(),
    socialNetworks: zod_1.z.array(zod_1.z.string()),
    mainProducts: zod_1.z.string().nullable(),
    differentiators: zod_1.z.string().nullable(),
    updatedAt: zod_1.z.string(),
});
exports.updateBrandProfileSchema = zod_1.z.object({
    brandVoice: zod_1.z.string().min(10).max(2000).optional(),
    palette: brand_palette_1.brandPaletteSchema.optional(),
    typography: zod_1.z.string().max(200).optional().nullable(),
    visualStyle: zod_1.z.string().max(200).optional().nullable(),
    niche: zod_1.z.string().max(200).optional().nullable(),
    description: zod_1.z.string().max(2000).optional().nullable(),
    targetAudience: zod_1.z.string().max(1000).optional().nullable(),
    marketingObjective: exports.marketingObjectiveSchema.nullable().optional(),
    socialNetworks: zod_1.z.array(zod_1.z.string()).optional(),
    mainProducts: zod_1.z.string().max(2000).optional().nullable(),
    differentiators: zod_1.z.string().max(2000).optional().nullable(),
});
exports.updateLogoSchema = zod_1.z.object({
    variant: brand_visual_1.logoVariantSchema,
    logoStorageKey: zod_1.z.string().min(1),
});
exports.addBrandAssetSchema = zod_1.z.object({
    storageKey: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(120).optional(),
    mimeType: zod_1.z.string().max(120).optional(),
});
exports.onboardingStatusSchema = zod_1.z.object({
    completed: zod_1.z.boolean(),
});
exports.homeDestinationSchema = zod_1.z.enum([
    'onboarding',
    'dashboard',
    'workspaces',
]);
exports.homeDestinationResponseSchema = zod_1.z.object({
    destination: exports.homeDestinationSchema,
    companyCount: zod_1.z.number().int().nonnegative(),
    onboardedCount: zod_1.z.number().int().nonnegative(),
});
exports.companyListItemSchema = exports.companyResponseSchema;
