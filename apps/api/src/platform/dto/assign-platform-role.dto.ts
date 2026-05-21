import { z } from 'zod';

export const PLATFORM_ROLES = ['platform_owner', 'platform_admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const assignPlatformRoleSchema = z.strictObject({
  userId: z.string().min(1, 'userId is required'),
  role: z.enum(PLATFORM_ROLES, {
    errorMap: () => ({
      message: `role must be one of: ${PLATFORM_ROLES.join(', ')}`,
    }),
  }),
});

export type AssignPlatformRoleDto = z.infer<typeof assignPlatformRoleSchema>;
