import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createRoleSchema } from './dto';
import { RoleService } from './role.service';

@Controller('organizations/:orgId/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('role.read')
  async findAll(@Param('orgId') orgId: string) {
    return this.roleService.findByOrganization(orgId);
  }

  @Get(':roleId')
  @RequirePermission('role.read')
  async findOne(@Param('roleId') roleId: string) {
    return this.roleService.findById(roleId);
  }

  @Post()
  @RequirePermission('role.create')
  async create(@Param('orgId') orgId: string, @Body() body: Record<string, unknown>) {
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.roleService.create(orgId, parsed.data);
  }

  @Put(':roleId')
  @RequirePermission('role.update')
  async update(@Param('roleId') roleId: string, @Body() body: Record<string, unknown>) {
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.roleService.update(roleId, parsed.data);
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('role.delete')
  async delete(@Param('roleId') roleId: string) {
    await this.roleService.delete(roleId);
  }
}
