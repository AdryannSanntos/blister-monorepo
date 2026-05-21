import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { CurrentUser } from '../../auth/session.service';
import type { PlatformRole } from '../dto';
import { REQUIRED_PLATFORM_ROLE_KEY } from '../decorators/require-platform-role.decorator';
import { PlatformService } from '../platform.service';

/**
 * PlatformRoleGuard
 *
 * Checks that the authenticated user has the required platform role.
 * - `platform_owner` satisfies both owner-only and admin-level access.
 * - `platform_admin` satisfies admin-level access only.
 *
 * Runs after the global AuthGuard (which already set request.currentUser).
 * Does NOT check organization membership — platform roles are global.
 */
@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(
    private readonly platformService: PlatformService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<PlatformRole | undefined>(
      REQUIRED_PLATFORM_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No platform role metadata — skip this guard
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = (request as unknown as Record<string, unknown>).currentUser as
      | CurrentUser
      | undefined;

    if (!currentUser) {
      throw new ForbiddenException('No authenticated user found');
    }

    const assignments = await this.platformService.getUserPlatformRoles(currentUser.id);
    const userRoles = new Set(assignments.map((a) => a.role));

    const isOwner = userRoles.has('platform_owner');
    const isAdmin = userRoles.has('platform_admin');

    if (requiredRole === 'platform_owner') {
      // Only platform_owner satisfies owner-only endpoints
      if (!isOwner) {
        throw new ForbiddenException('platform_owner role required');
      }
    } else if (requiredRole === 'platform_admin') {
      // Both platform_owner and platform_admin satisfy admin-level endpoints
      if (!isOwner && !isAdmin) {
        throw new ForbiddenException('platform_admin role required');
      }
    }

    return true;
  }
}
