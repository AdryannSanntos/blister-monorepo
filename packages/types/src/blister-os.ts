import { z } from 'zod';
import { cutsAgentSettingsSchema } from './agents/cuts';

export { cutsAgentSettingsSchema, type CutsAgentSettings } from './agents/cuts';

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
  config: cutsAgentSettingsSchema,
});

export type AgentWorkspaceSettingsResponse = z.infer<
  typeof agentWorkspaceSettingsResponseSchema
>;

export const updateAgentWorkspaceSettingsSchema = z.object({
  config: cutsAgentSettingsSchema,
});

export type UpdateAgentWorkspaceSettingsDto = z.infer<
  typeof updateAgentWorkspaceSettingsSchema
>;

export const marketplaceItemTypeSchema = z.enum([
  'edit-style',
  'post-style',
  'caption-style',
  'pack',
  'template',
  'asset',
  'agent',
]);

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
});

export type MarketplaceItemDto = z.infer<typeof marketplaceItemSchema>;

export const redeemMarketplaceSchema = z.object({
  itemId: z.string().min(1),
});

export type RedeemMarketplaceDto = z.infer<typeof redeemMarketplaceSchema>;

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
