"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSONAL_WORKSPACE_ID = exports.workspaceOptionSchema = exports.personalSpaceSchema = exports.filePresignedUploadResponseSchema = exports.filePresignedUploadRequestSchema = exports.updateWorkspaceFileSchema = exports.updateFolderSchema = exports.createFolderSchema = exports.fileBrowseResponseSchema = exports.workspaceFolderSchema = exports.workspaceFileSchema = exports.updateProjectSchema = exports.createProjectSchema = exports.projectSchema = exports.setMarketplaceItemActiveSchema = exports.updateMarketplaceItemSchema = exports.upsertMarketplaceItemSchema = exports.adminMarketplaceItemSchema = exports.redeemMarketplaceSchema = exports.marketplaceItemSchema = exports.textStyleSpecSchema = exports.textStyleAnimationSchema = exports.marketplaceItemTypeSchema = exports.updateAgentWorkspaceSettingsSchema = exports.agentWorkspaceSettingsResponseSchema = exports.updateWorkspaceSettingsSchema = exports.workspaceProfileSchema = exports.agentWorkspaceSettingsConfigSchema = exports.carouselAgentSettingsSchema = exports.cutsAgentSettingsSchema = void 0;
const zod_1 = require("zod");
var cuts_1 = require("./agents/cuts");
Object.defineProperty(exports, "cutsAgentSettingsSchema", { enumerable: true, get: function () { return cuts_1.cutsAgentSettingsSchema; } });
var carousel_1 = require("./agents/carousel");
Object.defineProperty(exports, "carouselAgentSettingsSchema", { enumerable: true, get: function () { return carousel_1.carouselAgentSettingsSchema; } });
/** Opaque JSON until validated per agentId (cuts vs carousel). */
exports.agentWorkspaceSettingsConfigSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.workspaceProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().optional(),
    niche: zod_1.z.string().optional(),
    audience: zod_1.z.string().optional(),
    voice: zod_1.z.string().optional(),
    positioning: zod_1.z.string().optional(),
    contentPreferences: zod_1.z.string().optional(),
    logoStorageKey: zod_1.z.string().optional(),
    palette: zod_1.z.array(zod_1.z.string()).optional(),
    timezone: zod_1.z.string().optional(),
});
exports.updateWorkspaceSettingsSchema = exports.workspaceProfileSchema.partial();
exports.agentWorkspaceSettingsResponseSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    config: exports.agentWorkspaceSettingsConfigSchema,
});
exports.updateAgentWorkspaceSettingsSchema = zod_1.z.object({
    config: exports.agentWorkspaceSettingsConfigSchema,
});
exports.marketplaceItemTypeSchema = zod_1.z.enum([
    'edit-style',
    'post-style',
    'caption-style',
    'text-style',
    'pack',
    'template',
    'asset',
    'agent',
]);
/** Animation slugs implemented as Remotion compositions (see apps/api/src/video). */
exports.textStyleAnimationSchema = zod_1.z.enum([
    'neon-wave',
    'clean-split',
    'kinetic-bold',
    'glass-blur',
    'broadcast',
]);
/**
 * Render spec carried by a TEXT_STYLE marketplace item (`specs` json). Drives
 * both the marketplace video preview and the Remotion overlay render.
 * `fontSize` is the base size in px at 1080×1920 (9:16).
 */
exports.textStyleSpecSchema = zod_1.z.object({
    previewUrl: zod_1.z.union([zod_1.z.string().url(), zod_1.z.string().regex(/^\//)]),
    animation: exports.textStyleAnimationSchema,
    fontFamily: zod_1.z.string(),
    fontSize: zod_1.z.number().positive(),
    color: zod_1.z.string(),
    bgColor: zod_1.z.string().optional(),
    shadowColor: zod_1.z.string().optional(),
});
exports.marketplaceItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    slug: zod_1.z.string(),
    type: exports.marketplaceItemTypeSchema,
    name: zod_1.z.string(),
    author: zod_1.z.string(),
    price: zod_1.z.number().int().nonnegative(),
    flag: zod_1.z.string().nullable(),
    description: zod_1.z.string(),
    palette: zod_1.z.array(zod_1.z.string()),
    specs: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    includes: zod_1.z.array(zod_1.z.string()),
    refId: zod_1.z.string().nullable(),
    owned: zod_1.z.boolean().optional(),
    /** Looping mp4 preview for animated styles (TEXT_STYLE). Absolute or site-relative path. */
    previewUrl: zod_1.z.union([zod_1.z.string().url(), zod_1.z.string().regex(/^\//)]).optional(),
});
exports.redeemMarketplaceSchema = zod_1.z.object({
    itemId: zod_1.z.string().min(1),
});
/** Admin view of a catalog item — includes the moderation `isActive` flag. */
exports.adminMarketplaceItemSchema = exports.marketplaceItemSchema.extend({
    isActive: zod_1.z.boolean(),
});
/** Create/update payload for the marketplace admin. `specs` is free-form json. */
exports.upsertMarketplaceItemSchema = zod_1.z.object({
    slug: zod_1.z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    type: exports.marketplaceItemTypeSchema,
    name: zod_1.z.string().min(1),
    author: zod_1.z.string().min(1),
    price: zod_1.z.number().int().nonnegative().default(0),
    flag: zod_1.z.string().nullable().optional(),
    description: zod_1.z.string().default(''),
    palette: zod_1.z.array(zod_1.z.string()).default([]),
    specs: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    includes: zod_1.z.array(zod_1.z.string()).default([]),
    refId: zod_1.z.string().nullable().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateMarketplaceItemSchema = exports.upsertMarketplaceItemSchema.partial();
exports.setMarketplaceItemActiveSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.projectSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    objective: zod_1.z.string(),
    linkedAgentIds: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    objective: zod_1.z.string().min(1).max(500),
    linkedAgentIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateProjectSchema = exports.createProjectSchema.partial();
exports.workspaceFileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    folderId: zod_1.z.string(),
    name: zod_1.z.string(),
    mimeType: zod_1.z.string(),
    sizeBytes: zod_1.z.number().nullable(),
    status: zod_1.z.enum(['pending', 'processing', 'indexed', 'failed']),
    extractData: zod_1.z.boolean(),
    origin: zod_1.z.enum(['upload', 'agent_run', 'integration']),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.workspaceFolderSchema = zod_1.z.object({
    id: zod_1.z.string(),
    parentId: zod_1.z.string().nullable(),
    name: zod_1.z.string(),
    kind: zod_1.z.enum(['system', 'user']),
    systemKey: zod_1.z.string().nullable(),
    fileCount: zod_1.z.number().int().nonnegative().optional(),
});
exports.fileBrowseResponseSchema = zod_1.z.object({
    folderId: zod_1.z.string().nullable(),
    folders: zod_1.z.array(exports.workspaceFolderSchema),
    files: zod_1.z.array(exports.workspaceFileSchema),
});
exports.createFolderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    parentId: zod_1.z.string().optional(),
});
exports.updateFolderSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).optional(),
    parentId: zod_1.z.string().nullable().optional(),
})
    .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: 'At least one field must be provided',
});
exports.updateWorkspaceFileSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(255).optional(),
    folderId: zod_1.z.string().optional(),
})
    .refine((value) => value.name !== undefined || value.folderId !== undefined, {
    message: 'At least one field must be provided',
});
/**
 * Request a presigned upload URL whose S3 key mirrors the workspace folder
 * tree. The destination is the explicit `folderId` (must be a user folder, not
 * an agent folder); when absent the default "Uploads" folder is used.
 */
exports.filePresignedUploadRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    mimeType: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().positive(),
    folderId: zod_1.z.string().optional(),
});
exports.filePresignedUploadResponseSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    key: zod_1.z.string(),
    folderId: zod_1.z.string(),
    /** Final (collision-resolved) file name reserved for this upload. */
    name: zod_1.z.string(),
    expiresIn: zod_1.z.number(),
});
exports.personalSpaceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.workspaceOptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['personal', 'company']),
    name: zod_1.z.string(),
    onboardingCompletedAt: zod_1.z.string().nullable().optional(),
});
exports.PERSONAL_WORKSPACE_ID = 'personal';
