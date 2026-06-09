import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { RolesService } from './roles.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Get('me/permissions')
  async getMyPermissions(@Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    const permissions = await this.rolesService.getEffectiveAbilityForUser(currentUser.id);
    return { permissions };
  }

  @Get()
  @RequirePermission('member.read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission('member.read')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
