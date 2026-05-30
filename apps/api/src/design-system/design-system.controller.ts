import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { DesignSystemService } from './design-system.service';
import {
  createColorGroupSchema,
  createColorTokenSchema,
  createDesignAssetSchema,
  createUploadUrlSchema,
  updateColorGroupSchema,
  updateColorTokenSchema,
  updateDesignAssetSchema,
  updateDesignIdentitySchema,
} from './dto';

type UploadedBinaryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function parseBody<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown } }, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestException(parsed.error);
  return parsed.data;
}

const uploadAssetFileSchema = z.object({
  primaryRole: createUploadUrlSchema.shape.primaryRole,
});

@Controller('organizations/:orgId/design-system')
export class DesignSystemController {
  constructor(private readonly designSystemService: DesignSystemService) {}

  @Get()
  @RequirePermission('design-system.read')
  async getDesignSystem(@Param('orgId') orgId: string) {
    return this.designSystemService.getDesignSystem(orgId);
  }

  @Patch('identity')
  @RequirePermission('design-system.update')
  async updateIdentity(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.designSystemService.updateIdentity(orgId, parseBody(updateDesignIdentitySchema, body));
  }

  @Post('color-groups')
  @RequirePermission('design-system.update')
  async createColorGroup(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.designSystemService.createColorGroup(orgId, parseBody(createColorGroupSchema, body));
  }

  @Patch('color-groups/:colorGroupId')
  @RequirePermission('design-system.update')
  async updateColorGroup(
    @Param('orgId') orgId: string,
    @Param('colorGroupId') colorGroupId: string,
    @Body() body: unknown,
  ) {
    return this.designSystemService.updateColorGroup(
      orgId,
      colorGroupId,
      parseBody(updateColorGroupSchema, body),
    );
  }

  @Delete('color-groups/:colorGroupId')
  @RequirePermission('design-system.update')
  async deleteColorGroup(@Param('orgId') orgId: string, @Param('colorGroupId') colorGroupId: string) {
    return this.designSystemService.deleteColorGroup(orgId, colorGroupId);
  }

  @Post('colors')
  @RequirePermission('design-system.update')
  async createColorToken(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.designSystemService.createColorToken(orgId, parseBody(createColorTokenSchema, body));
  }

  @Patch('colors/:colorTokenId')
  @RequirePermission('design-system.update')
  async updateColorToken(
    @Param('orgId') orgId: string,
    @Param('colorTokenId') colorTokenId: string,
    @Body() body: unknown,
  ) {
    return this.designSystemService.updateColorToken(
      orgId,
      colorTokenId,
      parseBody(updateColorTokenSchema, body),
    );
  }

  @Delete('colors/:colorTokenId')
  @RequirePermission('design-system.update')
  async deleteColorToken(@Param('orgId') orgId: string, @Param('colorTokenId') colorTokenId: string) {
    return this.designSystemService.deleteColorToken(orgId, colorTokenId);
  }

  @Post('assets/upload-url')
  @RequirePermission('design-system.update')
  async createAssetUploadUrl(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.designSystemService.createAssetUploadUrl(orgId, parseBody(createUploadUrlSchema, body));
  }

  @Post('assets/upload')
  @RequirePermission('design-system.update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAssetFile(
    @Param('orgId') orgId: string,
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Body() body: unknown,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const parsed = parseBody(uploadAssetFileSchema, body);
    return this.designSystemService.uploadAssetFile(orgId, {
      primaryRole: parsed.primaryRole,
      fileName: file.originalname,
      contentType: file.mimetype || 'application/octet-stream',
      size: file.size,
      body: file.buffer,
    });
  }

  @Post('assets')
  @RequirePermission('design-system.update')
  async createAsset(@Param('orgId') orgId: string, @Body() body: unknown) {
    return this.designSystemService.createAsset(orgId, parseBody(createDesignAssetSchema, body));
  }

  @Patch('assets/:assetId')
  @RequirePermission('design-system.update')
  async updateAsset(
    @Param('orgId') orgId: string,
    @Param('assetId') assetId: string,
    @Body() body: unknown,
  ) {
    return this.designSystemService.updateAsset(orgId, assetId, parseBody(updateDesignAssetSchema, body));
  }

  @Delete('assets/:assetId')
  @RequirePermission('design-system.update')
  async deleteAsset(@Param('orgId') orgId: string, @Param('assetId') assetId: string) {
    return this.designSystemService.deleteAsset(orgId, assetId);
  }

  @Post('regenerate-artifact')
  @RequirePermission('design-system.update')
  async regenerateArtifact(@Param('orgId') orgId: string) {
    return this.designSystemService.regenerateArtifact(orgId);
  }
}
