import type { AppPermissionKey } from '@company-os/authz';
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (key: AppPermissionKey) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, key);
