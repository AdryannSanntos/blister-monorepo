import { SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '../dto';

export const REQUIRED_PLATFORM_ROLE_KEY = 'requiredPlatformRole';

export const RequirePlatformRole = (role: PlatformRole) =>
  SetMetadata(REQUIRED_PLATFORM_ROLE_KEY, role);
