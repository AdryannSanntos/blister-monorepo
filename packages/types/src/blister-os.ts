import { z } from 'zod';
import { carouselAgentSettingsSchema } from './agents/carousel';
import { cutsAgentSettingsSchema } from './agents/cuts';

export { cutsAgentSettingsSchema, type CutsAgentSettings } from './agents/cuts';
export {
  carouselAgentSettingsSchema,
  type CarouselAgentSettings,
} from './agents/carousel';

/** Opaque JSON until validated per agentId (cuts vs carousel). */
export const agentWorkspaceSettingsConfigSchema = z.record(z.string(), z.unknown());

export const workspaceProfileSchema = z.object({
  displayName: z.string().optional(),
  niche: z.string().optional(),
  audience: z.string().optional(),
  voice: z.string().optional(),
  positioning: z.string().optional(),
  contentPreferences: z.string().optional(),
  logoStorageKey: z.string().optional(),
  palette: z.array(z.string()).optional(),
  timezone: z.string().optional(),
});

export type WorkspaceProfile = z.infer<typeof workspaceProfileSchema>;

export const updateWorkspaceSettingsSchema = workspaceProfileSchema.partial();

export type UpdateWorkspaceSettingsDto = z.infer<typeof updateWorkspaceSettingsSchema>;

export const agentWorkspaceSettingsResponseSchema = z.object({
  agentId: z.string(),
  config: agentWorkspaceSettingsConfigSchema,
});

export type AgentWorkspaceSettingsResponse = z.infer<
  typeof agentWorkspaceSettingsResponseSchema
>;

export const updateAgentWorkspaceSettingsSchema = z.object({
  config: agentWorkspaceSettingsConfigSchema,
});

export type UpdateAgentWorkspaceSettingsDto = z.infer<
  typeof updateAgentWorkspaceSettingsSchema
>;

export const marketplaceItemTypeSchema = z.enum([
  'edit-style',
  'post-style',
  'caption-style',
  'text-style',
  'pack',
  'template',
  'asset',
  'agent',
]);

export type MarketplaceItemType = z.infer<typeof marketplaceItemTypeSchema>;

/** Animation slugs implemented as Remotion compositions (see apps/api/src/video). */
export const textStyleAnimationSchema = z.enum([
  'neon-wave',
  'clean-split',
  'kinetic-bold',
  'glass-blur',
  'broadcast',
]);

export type TextStyleAnimation = z.infer<typeof textStyleAnimationSchema>;

/**
 * Render spec carried by a TEXT_STYLE marketplace item (`specs` json). Drives
 * both the marketplace video preview and the Remotion overlay render.
 * `fontSize` is the base size in px at 1080×1920 (9:16).
 */
export const textStyleSpecSchema = z.object({
  previewUrl: z.union([z.string().url(), z.string().regex(/^\//)]),
  animation: textStyleAnimationSchema,
  fontFamily: z.string(),
  fontSize: z.number().positive(),
  color: z.string(),
  bgColor: z.string().optional(),
  shadowColor: z.string().optional(),
});

export type TextStyleSpec = z.infer<typeof textStyleSpecSchema>;

export const marketplaceItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  type: marketplaceItemTypeSchema,
  name: z.string(),
  author: z.string(),
  price: z.number().int().nonnegative(),
  flag: z.string().nullable(),
  description: z.string(),
  palette: z.array(z.string()),
  specs: z.record(z.string(), z.string()),
  includes: z.array(z.string()),
  refId: z.string().nullable(),
  owned: z.boolean().optional(),
  /** Looping mp4 preview for animated styles (TEXT_STYLE). Absolute or site-relative path. */
  previewUrl: z.union([z.string().url(), z.string().regex(/^\//)]).optional(),
});

export type MarketplaceItemDto = z.infer<typeof marketplaceItemSchema>;

export const redeemMarketplaceSchema = z.object({
  itemId: z.string().min(1),
});

export type RedeemMarketplaceDto = z.infer<typeof redeemMarketplaceSchema>;

/** Admin view of a catalog item — includes the moderation `isActive` flag. */
export const adminMarketplaceItemSchema = marketplaceItemSchema.extend({
  isActive: z.boolean(),
});

export type AdminMarketplaceItemDto = z.infer<typeof adminMarketplaceItemSchema>;

/** Create/update payload for the marketplace admin. `specs` is free-form json. */
export const upsertMarketplaceItemSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  type: marketplaceItemTypeSchema,
  name: z.string().min(1),
  author: z.string().min(1),
  price: z.number().int().nonnegative().default(0),
  flag: z.string().nullable().optional(),
  description: z.string().default(''),
  palette: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.unknown()).default({}),
  includes: z.array(z.string()).default([]),
  refId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type UpsertMarketplaceItemDto = z.infer<typeof upsertMarketplaceItemSchema>;

export const updateMarketplaceItemSchema = upsertMarketplaceItemSchema.partial();

export type UpdateMarketplaceItemDto = z.infer<typeof updateMarketplaceItemSchema>;

export const setMarketplaceItemActiveSchema = z.object({
  isActive: z.boolean(),
});

export type SetMarketplaceItemActiveDto = z.infer<
  typeof setMarketplaceItemActiveSchema
>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  objective: z.string(),
  linkedAgentIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectDto = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  objective: z.string().min(1).max(500),
  linkedAgentIds: z.array(z.string()).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export const workspaceFileSchema = z.object({
  id: z.string(),
  folderId: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().nullable(),
  status: z.enum(['pending', 'processing', 'indexed', 'failed']),
  extractData: z.boolean(),
  origin: z.enum(['upload', 'agent_run', 'integration']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkspaceFileDto = z.infer<typeof workspaceFileSchema>;

export const workspaceFolderSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  kind: z.enum(['system', 'user']),
  systemKey: z.string().nullable(),
  fileCount: z.number().int().nonnegative().optional(),
});

export type WorkspaceFolderDto = z.infer<typeof workspaceFolderSchema>;

export const fileBrowseResponseSchema = z.object({
  folderId: z.string().nullable(),
  folders: z.array(workspaceFolderSchema),
  files: z.array(workspaceFileSchema),
});

export type FileBrowseResponse = z.infer<typeof fileBrowseResponseSchema>;

export const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().optional(),
});

export type CreateFolderDto = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    parentId: z.string().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateFolderDto = z.infer<typeof updateFolderSchema>;

export const updateWorkspaceFileSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    folderId: z.string().optional(),
  })
  .refine((value) => value.name !== undefined || value.folderId !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateWorkspaceFileDto = z.infer<typeof updateWorkspaceFileSchema>;

/**
 * Request a presigned upload URL whose S3 key mirrors the workspace folder
 * tree. The destination is the explicit `folderId` (must be a user folder, not
 * an agent folder); when absent the default "Uploads" folder is used.
 */
export const filePresignedUploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  folderId: z.string().optional(),
});

export type FilePresignedUploadRequest = z.infer<
  typeof filePresignedUploadRequestSchema
>;

export const filePresignedUploadResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  folderId: z.string(),
  /** Final (collision-resolved) file name reserved for this upload. */
  name: z.string(),
  expiresIn: z.number(),
});

export type FilePresignedUploadResponse = z.infer<
  typeof filePresignedUploadResponseSchema
>;

export const personalSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PersonalSpaceDto = z.infer<typeof personalSpaceSchema>;

export const workspaceOptionSchema = z.object({
  id: z.string(),
  type: z.enum(['personal', 'company']),
  name: z.string(),
  onboardingCompletedAt: z.string().nullable().optional(),
});

export type WorkspaceOptionDto = z.infer<typeof workspaceOptionSchema>;

export const PERSONAL_WORKSPACE_ID = 'personal';
