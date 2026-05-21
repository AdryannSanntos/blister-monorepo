import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ContextService } from './context.service';
import {
  createContextSourceSchema,
  createContextUploadUrlSchema,
  listContextSourcesSchema,
  reviewContextSourceSchema,
  updateContextSourceSchema,
} from './dto';

function parseBody<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: unknown } },
  body: unknown,
): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestException(parsed.error);
  return parsed.data;
}

@Controller('organizations/:orgId/context')
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  @RequirePermission('context.read')
  async list(@Param('orgId') orgId: string, @Query() query: unknown) {
    return this.contextService.list(orgId, parseBody(listContextSourcesSchema, query));
  }

  @Get('artifact')
  @RequirePermission('context.read')
  async getArtifact(@Param('orgId') orgId: string) {
    return this.contextService.getArtifact(orgId);
  }

  @Get(':sourceId')
  @RequirePermission('context.read')
  async getById(@Param('orgId') orgId: string, @Param('sourceId') sourceId: string) {
    return this.contextService.getById(orgId, sourceId);
  }

  @Post('upload-url')
  @RequirePermission('context.create')
  async createUploadUrl(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.contextService.createUploadUrl(orgId, parseBody(createContextUploadUrlSchema, body));
  }

  @Post()
  @RequirePermission('context.create')
  async create(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.contextService.create(orgId, parseBody(createContextSourceSchema, body), user.id);
  }

  @Patch(':sourceId')
  @RequirePermission('context.update')
  async update(
    @Param('orgId') orgId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: unknown,
  ) {
    return this.contextService.update(orgId, sourceId, parseBody(updateContextSourceSchema, body));
  }

  @Post(':sourceId/review')
  @RequirePermission('context.review')
  async review(
    @Param('orgId') orgId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.contextService.review(orgId, sourceId, parseBody(reviewContextSourceSchema, body), user.id);
  }

  @Post('artifact/sync')
  @RequirePermission('context.publish')
  async syncArtifact(@Param('orgId') orgId: string) {
    return this.contextService.triggerArtifactSync(orgId);
  }

  @Delete(':sourceId')
  @RequirePermission('context.delete')
  async delete(@Param('orgId') orgId: string, @Param('sourceId') sourceId: string) {
    return this.contextService.delete(orgId, sourceId);
  }
}
