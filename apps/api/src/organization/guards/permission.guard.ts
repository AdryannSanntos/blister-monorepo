import type { AppPermissionKey } from '@company-os/authz';
import { permissionMap } from '@company-os/authz';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRED_PERMISSION_KEY } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { MembershipService } from '../membership.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<AppPermissionKey | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission metadata — auth alone is sufficient
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = (request as unknown as Record<string, unknown>)['currentUser'] as
      | CurrentUser
      | undefined;

    if (!currentUser) {
      throw new ForbiddenException('No authenticated user found');
    }

    const params = request.params as Record<string, string>;
    // Try 'orgId' first (nested routes like /organizations/:orgId/members),
    // then fall back to 'id' (top-level routes like /organizations/:id)
    const orgId = params['orgId'] ?? params['id'];

    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    let ability;
    try {
      ability = await this.membershipService.getEffectiveAbility(orgId, currentUser.id);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new ForbiddenException('You are not a member of this organization');
      }
      throw err;
    }

    const mapping = permissionMap[requiredPermission];
    if (!mapping) {
      throw new ForbiddenException('Unknown permission key');
    }

    const [action, subject] = mapping;
    if (!ability.can(action, subject)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    (request as unknown as Record<string, unknown>)['orgContext'] = { ability };

    return true;
  }
}
