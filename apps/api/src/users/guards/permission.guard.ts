import type { AppAbility, AppPermissionKey } from '@company-os/authz';
import { defineAbilityForPermissions, permissionMap } from '@company-os/authz';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRED_PERMISSION_KEY } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { RolesService } from '../roles.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly rolesService: RolesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<AppPermissionKey | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = (request as unknown as Record<string, unknown>).currentUser as
      | CurrentUser
      | undefined;

    if (!currentUser) {
      throw new ForbiddenException('No authenticated user found');
    }

    const permissionKeys = await this.rolesService.getEffectiveAbilityForUser(currentUser.id);
    const ability: AppAbility = defineAbilityForPermissions(permissionKeys as AppPermissionKey[]);

    const mapping = permissionMap[requiredPermission];
    if (!mapping) {
      throw new ForbiddenException('Unknown permission key');
    }

    const [action, subject] = mapping;
    if (!ability.can(action, subject)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
