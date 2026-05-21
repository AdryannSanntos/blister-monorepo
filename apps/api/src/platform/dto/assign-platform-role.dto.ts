import { z } from 'zod';

export const PLATFORM_ROLES = ['platform_owner', 'platform_admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const assignPlatformRoleSchema = z.strictObject({
  role: z.enum(PLATFORM_ROLES),
});

export type AssignPlatformRoleDto = z.infer<typeof assignPlatformRoleSchema>;
