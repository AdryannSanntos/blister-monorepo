import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  redeemMarketplaceSchema,
  setMarketplaceItemActiveSchema,
  updateMarketplaceItemSchema,
  upsertMarketplaceItemSchema,
} from '@company-os/types';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('items')
  @RequirePermission('marketplace.read')
  listItems(@Req() req: Request, @Query('type') type?: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.marketplaceService.listItemsWithOwnership(user.id, req, type);
  }

  @Get('items/:id')
  @RequirePermission('marketplace.read')
  getItem(@Param('id') id: string) {
    return this.marketplaceService.getItem(id);
  }

  @Post('redeem')
  @RequirePermission('marketplace.redeem')
  redeem(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = redeemMarketplaceSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.marketplaceService.redeem(user.id, req, parsed.data.itemId);
  }

  @Get('entitlements')
  @RequirePermission('library.read')
  getEntitlements(@Req() req: Request, @Query('type') type?: string) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.marketplaceService.getEntitlements(user.id, req, type);
  }

  // ─── Admin (marketplace.manage) ───────────────────────────────────────────

  @Get('admin/items')
  @RequirePermission('marketplace.manage')
  listAllItems() {
    return this.marketplaceService.listAllItems();
  }

  @Post('admin/items')
  @RequirePermission('marketplace.manage')
  createItem(@Body() body: unknown) {
    const parsed = upsertMarketplaceItemSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.marketplaceService.createItem(parsed.data);
  }

  @Patch('admin/items/:id')
  @RequirePermission('marketplace.manage')
  updateItem(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateMarketplaceItemSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.marketplaceService.updateItem(id, parsed.data);
  }

  @Patch('admin/items/:id/active')
  @RequirePermission('marketplace.manage')
  setItemActive(@Param('id') id: string, @Body() body: unknown) {
    const parsed = setMarketplaceItemActiveSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.marketplaceService.setItemActive(id, parsed.data.isActive);
  }
}
