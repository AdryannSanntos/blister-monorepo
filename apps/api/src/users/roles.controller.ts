import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { createRoleSchema, updateRoleSchema } from './dto/roles.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('role.read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('role.read')
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermission('role.create')
  async create(@Req() req: Request, @Body() body: unknown) {
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    return this.rolesService.createRole(currentUser.id, parsed.data);
  }

  @Patch(':id')
  @RequirePermission('role.update')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    return this.rolesService.updateRole(currentUser.id, id, parsed.data);
  }

  @Delete(':id')
  @RequirePermission('role.delete')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const currentUser = (req as unknown as Record<string, unknown>)
      .currentUser as CurrentUser;

    return this.rolesService.deleteRole(currentUser.id, id);
  }
}
