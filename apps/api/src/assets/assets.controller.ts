import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AssetsService } from './assets.service';
import {
  bulkUpdateAssetsSchema,
  createAssetSchema,
  listAssetsSchema,
  updateAssetSchema,
} from './dto';

@Controller('organizations/:orgId/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @RequirePermission('asset.read')
  async listAssets(@Param('orgId') orgId: string, @Query() query: unknown) {
    const parsed = listAssetsSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.assetsService.listAssets(orgId, parsed.data);
  }

  @Get(':assetId')
  @RequirePermission('asset.read')
  async getAsset(@Param('orgId') orgId: string, @Param('assetId') assetId: string) {
    return this.assetsService.getAssetById(orgId, assetId);
  }

  @Post()
  @RequirePermission('asset.create')
  async createAsset(@Param('orgId') orgId: string, @Body() body: unknown) {
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.assetsService.createAsset(orgId, parsed.data);
  }

  @Patch(':assetId')
  @RequirePermission('asset.update')
  async updateAsset(
    @Param('orgId') orgId: string,
    @Param('assetId') assetId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.assetsService.updateAsset(orgId, assetId, parsed.data);
  }

  @Post('bulk')
  @RequirePermission('asset.update')
  async bulkUpdateAssets(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = bulkUpdateAssetsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    if (['approve_context', 'discard_context', 'promote_to_context'].includes(parsed.data.action)) {
      const orgContext = (req as unknown as Record<string, unknown>).orgContext as
        | { ability?: { can: (action: string, subject: string) => boolean } }
        | undefined;

      if (!orgContext?.ability?.can('update', 'ContextAsset')) {
        throw new ForbiddenException('You do not have permission to review context assets');
      }
    }

    if (['archive', 'mark_obsolete'].includes(parsed.data.action)) {
      const orgContext = (req as unknown as Record<string, unknown>).orgContext as
        | { ability?: { can: (action: string, subject: string) => boolean } }
        | undefined;

      if (!orgContext?.ability?.can('delete', 'Asset')) {
        throw new ForbiddenException('You do not have permission to archive assets');
      }
    }

    return this.assetsService.bulkUpdateAssets(orgId, parsed.data);
  }
}
