import { type AppPermissionKey, isAppPermissionKey } from '@company-os/authz';
import { z } from 'zod';

export const membershipOverrideSchema = z.strictObject({
  key: z.custom<AppPermissionKey>(
    (value) => typeof value === 'string' && isAppPermissionKey(value),
    'Invalid permission key',
  ),
  effect: z.enum(['allow', 'deny']),
});

export type MembershipOverrideDto = z.infer<typeof membershipOverrideSchema>;
