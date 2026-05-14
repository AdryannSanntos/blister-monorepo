import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { MembershipService } from './membership.service';
import { updateOrganizationSchema } from './dto';
import { createOrganizationPayloadSchema } from './dto/create-organization.dto';
import { OrganizationService } from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly membershipService: MembershipService,
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const parsed = createOrganizationPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;

    return this.organizationService.createWorkspace(currentUser.id, parsed.data);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.organizationService.findByUserId(userId);
  }

  @Get(':id')
  @RequirePermission('company.read')
  async findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }

  @Get('slug/:slug')
  @RequirePermission('company.read')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationService.findBySlug(slug);
  }

  @Patch(':id')
  @RequirePermission('company.update')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const parsed = updateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.organizationService.update(id, parsed.data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('company.delete')
  async delete(@Param('id') id: string) {
    await this.organizationService.deleteOrganization(id);
  }

  @Post(':id/transfer')
  @RequirePermission('company.delete')
  async transferOwnership(@Param('id') orgId: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = (body as { toUserId?: unknown }).toUserId;
    if (typeof parsed !== 'string' || !parsed) {
      throw new BadRequestException('toUserId is required');
    }

    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;

    return this.organizationService.transferOwnership(orgId, currentUser.id, parsed);
  }

  @Get(':orgId/me/ability')
  @UseGuards(AuthGuard)
  async getMyAbility(@Param('orgId') orgId: string, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>)['currentUser'] as CurrentUser;

    const membership = await this.membershipService.findByOrgAndUser(orgId, currentUser.id);

    if (!membership) {
      return { permissions: [], overrides: [] };
    }

    const permissions = new Set<string>();
    for (const mr of membership.roles) {
      for (const rp of mr.role.permissions) {
        permissions.add(rp.key);
      }
    }

    const overrides = membership.overrides.map((o) => ({
      key: o.key,
      effect: o.effect,
    }));

    return {
      permissions: [...permissions],
      overrides,
    };
  }
}
