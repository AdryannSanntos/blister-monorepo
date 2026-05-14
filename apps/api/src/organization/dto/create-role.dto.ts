import { type AppPermissionKey, isAssignablePermissionKey } from '@company-os/authz';
import { z } from 'zod';

const permissionKeySchema = z.custom<AppPermissionKey>(
  (value) => typeof value === 'string' && isAssignablePermissionKey(value),
  'Invalid permission key',
);

export const createRoleSchema = z.strictObject({
  name: z.string().min(2).max(60),
  permissions: z.array(permissionKeySchema).min(1),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
