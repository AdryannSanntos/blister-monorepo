import { z } from 'zod';

export const memberRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
});

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  userType: z.string(),
  createdAt: z.string(),
  roles: z.array(memberRoleSchema),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const workspaceRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i),
  permissions: z.array(z.string()).min(1),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

export const deleteCompanySchema = z.object({
  confirmName: z.string().min(1),
});

export type DeleteCompanyDto = z.infer<typeof deleteCompanySchema>;
