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
import type { CurrentUser } from '../../auth/session.service';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CompanyService } from '../company.service';
import { BrandService } from './brand.service';
import {
  addBrandAssetBodySchema,
  removeBrandAssetParamsSchema,
  updateBrandBodySchema,
  updateLogoBodySchema,
} from './dto/brand.dto';

@Controller('company/brand')
export class BrandController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly brandService: BrandService,
  ) {}

  @Get()
  @RequirePermission('brand.read')
  async getBrand(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.brandService.findByCompanyId(company.id);
  }

  @Patch()
  @RequirePermission('brand.update')
  async updateBrand(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateBrandBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.brandService.update(company.id, user.id, parsed.data);
  }

  @Post('logo')
  @RequirePermission('brand.update')
  async updateLogo(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateLogoBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.brandService.updateLogo(
      company.id,
      company.slug,
      user.id,
      user.id,
      parsed.data,
    );
  }

  @Post('assets')
  @RequirePermission('brand.update')
  async addAsset(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = addBrandAssetBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.brandService.addAsset(
      company.id,
      company.slug,
      user.id,
      user.id,
      parsed.data,
    );
  }

  @Delete('assets/:assetId')
  @RequirePermission('brand.update')
  async removeAsset(@Req() req: Request, @Param() params: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = removeBrandAssetParamsSchema.safeParse(params);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.brandService.removeAsset(
      company.id,
      user.id,
      parsed.data.assetId,
    );
  }
}
