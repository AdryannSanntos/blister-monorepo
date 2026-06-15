"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSONAL_WORKSPACE_ID = exports.workspaceOptionSchema = exports.personalSpaceSchema = exports.filePresignedUploadResponseSchema = exports.filePresignedUploadRequestSchema = exports.updateWorkspaceFileSchema = exports.updateFolderSchema = exports.createFolderSchema = exports.fileBrowseResponseSchema = exports.workspaceFolderSchema = exports.workspaceFileSchema = exports.updateProjectSchema = exports.createProjectSchema = exports.projectSchema = exports.redeemMarketplaceSchema = exports.marketplaceItemSchema = exports.marketplaceItemTypeSchema = exports.updateAgentWorkspaceSettingsSchema = exports.agentWorkspaceSettingsResponseSchema = exports.updateWorkspaceSettingsSchema = exports.workspaceProfileSchema = exports.cutsAgentSettingsSchema = void 0;
const zod_1 = require("zod");
const cuts_1 = require("./agents/cuts");
var cuts_2 = require("./agents/cuts");
Object.defineProperty(exports, "cutsAgentSettingsSchema", { enumerable: true, get: function () { return cuts_2.cutsAgentSettingsSchema; } });
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
    config: cuts_1.cutsAgentSettingsSchema,
});
exports.updateAgentWorkspaceSettingsSchema = zod_1.z.object({
    config: cuts_1.cutsAgentSettingsSchema,
});
exports.marketplaceItemTypeSchema = zod_1.z.enum([
    'edit-style',
    'post-style',
    'caption-style',
    'pack',
    'template',
    'asset',
    'agent',
]);
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
});
exports.redeemMarketplaceSchema = zod_1.z.object({
    itemId: zod_1.z.string().min(1),
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
