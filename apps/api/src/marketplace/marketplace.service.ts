import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { MarketplaceItemDto } from '@company-os/types';
import type { MarketplaceItemType } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

const typeToSlug: Record<MarketplaceItemType, MarketplaceItemDto['type']> = {
  EDIT_STYLE: 'edit-style',
  POST_STYLE: 'post-style',
  CAPTION_STYLE: 'caption-style',
  PACK: 'pack',
  TEMPLATE: 'template',
  ASSET: 'asset',
  AGENT: 'agent',
};

const serializeItem = (
  item: {
    id: string;
    slug: string;
    type: MarketplaceItemType;
    name: string;
    author: string;
    price: number;
    flag: string | null;
    description: string;
    palette: unknown;
    specs: unknown;
    includes: unknown;
    refId: string | null;
  },
  owned = false,
): MarketplaceItemDto => ({
  id: item.id,
  slug: item.slug,
  type: typeToSlug[item.type],
  name: item.name,
  author: item.author,
  price: item.price,
  flag: item.flag,
  description: item.description,
  palette: Array.isArray(item.palette) ? (item.palette as string[]) : [],
  specs:
    item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs)
      ? (item.specs as Record<string, string>)
      : {},
  includes: Array.isArray(item.includes) ? (item.includes as string[]) : [],
  refId: item.refId,
  owned,
});

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly credits: CreditService,
  ) {}

  async listItems(typeFilter?: string) {
    const prismaType = typeFilter
      ? (Object.entries(typeToSlug).find(([, slug]) => slug === typeFilter)?.[0] as
          | MarketplaceItemType
          | undefined)
      : undefined;

    const items = await this.prisma.marketplaceItem.findMany({
      where: {
        isActive: true,
        ...(prismaType ? { type: prismaType } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return items.map((item) => serializeItem(item));
  }

  async getItem(itemId: string) {
    const item = await this.prisma.marketplaceItem.findFirst({
      where: { OR: [{ id: itemId }, { slug: itemId }], isActive: true },
    });
    if (!item) throw new NotFoundException('Marketplace item not found');
    return serializeItem(item);
  }

  private async getOwnedItemIds(workspace: Awaited<
    ReturnType<WorkspaceContextService['resolveFromRequest']>
  >) {
    if (workspace.type === 'personal') {
      const entitlements = await this.prisma.workspaceEntitlement.findMany({
        where: { personalSpaceId: workspace.personalSpaceId },
        select: { itemId: true },
      });
      return new Set(entitlements.map((e) => e.itemId));
    }

    const entitlements = await this.prisma.workspaceEntitlement.findMany({
      where: { companyId: workspace.companyId },
      select: { itemId: true },
    });
    return new Set(entitlements.map((e) => e.itemId));
  }

  async listItemsWithOwnership(userId: string, req: Request, typeFilter?: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const ownedIds = await this.getOwnedItemIds(workspace);
    const items = await this.listItems(typeFilter);
    return items.map((item) => ({ ...item, owned: ownedIds.has(item.id) }));
  }

  async getEntitlements(userId: string, req: Request, typeFilter?: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const where =
      workspace.type === 'personal'
        ? { personalSpaceId: workspace.personalSpaceId }
        : { companyId: workspace.companyId };

    const prismaType = typeFilter
      ? (Object.entries(typeToSlug).find(([, slug]) => slug === typeFilter)?.[0] as
          | MarketplaceItemType
          | undefined)
      : undefined;

    const entitlements = await this.prisma.workspaceEntitlement.findMany({
      where: {
        ...where,
        ...(prismaType ? { item: { type: prismaType } } : {}),
      },
      include: { item: true },
      orderBy: { redeemedAt: 'desc' },
    });

    return entitlements.map((entry) => serializeItem(entry.item, true));
  }

  async redeem(userId: string, req: Request, itemId: string) {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const item = await this.prisma.marketplaceItem.findFirst({
      where: { OR: [{ id: itemId }, { slug: itemId }], isActive: true },
    });
    if (!item) throw new NotFoundException('Marketplace item not found');

    const existing = await this.prisma.workspaceEntitlement.findFirst({
      where:
        workspace.type === 'personal'
          ? { personalSpaceId: workspace.personalSpaceId, itemId: item.id }
          : { companyId: workspace.companyId, itemId: item.id },
    });
    if (existing) {
      throw new UnprocessableEntityException('Item already owned');
    }

    if (item.price > 0) {
      if (workspace.type === 'company') {
        await this.credits.checkBalance(workspace.companyId, item.price);
        await this.credits.debit(
          workspace.companyId,
          item.price,
          `Marketplace redeem: ${item.name}`,
        );
      } else {
        await this.debitPersonalCredits(workspace.personalSpaceId, item.price);
      }
    }

    await this.prisma.workspaceEntitlement.create({
      data:
        workspace.type === 'personal'
          ? {
              itemId: item.id,
              personalSpaceId: workspace.personalSpaceId,
              redeemedByUserId: userId,
            }
          : {
              itemId: item.id,
              companyId: workspace.companyId,
              redeemedByUserId: userId,
            },
    });

    return serializeItem(item, true);
  }

  private async debitPersonalCredits(personalSpaceId: string, amount: number) {
    const balance = await this.prisma.personalCreditBalance.findUnique({
      where: { personalSpaceId },
    });
    if (!balance) throw new NotFoundException('Credit balance not found');

    const newAmount = Number(balance.amount) - amount;
    if (newAmount < 0) {
      throw new UnprocessableEntityException('Insufficient credit balance');
    }

    await this.prisma.personalCreditBalance.update({
      where: { personalSpaceId },
      data: { amount: newAmount },
    });
  }
}
