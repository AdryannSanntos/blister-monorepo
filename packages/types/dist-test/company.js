"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyListItemSchema = exports.homeDestinationResponseSchema = exports.homeDestinationSchema = exports.onboardingStatusSchema = exports.onboardingSchema = exports.visualStyleSchema = exports.visualStyleValues = exports.socialNetworkSchema = exports.socialNetworkValues = exports.marketingObjectiveSchema = exports.marketingObjectiveValues = exports.updateCompanySchema = exports.companyResponseSchema = exports.fileUploadResponseSchema = exports.presignedUploadResponseSchema = exports.presignedUploadRequestSchema = exports.MAX_PRESIGNED_UPLOAD_BYTES = void 0;
const zod_1 = require("zod");
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
exports.visualStyleValues = ['minimal', 'modern', 'traditional', 'bold', 'elegant'];
exports.visualStyleSchema = zod_1.z.enum(exports.visualStyleValues);
// Onboarding mínimo: empresa = nome (+ objetivo opcional). Demais campos da
// marca ficam opcionais e podem ser preenchidos depois nas Configurações.
exports.onboardingSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2).max(120),
    description: zod_1.z.string().max(500).optional(),
    niche: zod_1.z.string().max(200).optional(),
    brandVoice: zod_1.z.string().max(2000).optional(),
    logoStorageKey: zod_1.z.string().optional(),
    createNew: zod_1.z.boolean().optional(),
});
exports.onboardingStatusSchema = zod_1.z.object({
    completed: zod_1.z.boolean(),
});
exports.homeDestinationSchema = zod_1.z.enum(['onboarding', 'dashboard', 'workspaces']);
exports.homeDestinationResponseSchema = zod_1.z.object({
    destination: exports.homeDestinationSchema,
    companyCount: zod_1.z.number().int().nonnegative(),
    onboardedCount: zod_1.z.number().int().nonnegative(),
});
exports.companyListItemSchema = exports.companyResponseSchema;
