import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  AdminMarketplaceItemDto,
  MarketplaceItemDto,
  TextStyleSpec,
  UpdateMarketplaceItemDto,
  UpsertMarketplaceItemDto,
} from '@company-os/types';
import { textStyleSpecSchema } from '@company-os/types';
import type { Prisma } from '@company-os/db';
import type { MarketplaceItemType } from '@company-os/db';
import { CarouselTemplateService, TemplateNotFoundError } from '../agents/carousel/services/carousel-template.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

const typeToSlug: Record<MarketplaceItemType, MarketplaceItemDto['type']> = {
  EDIT_STYLE: 'edit-style',
  POST_STYLE: 'post-style',
  CAPTION_STYLE: 'caption-style',
  TEXT_STYLE: 'text-style',
  PACK: 'pack',
  TEMPLATE: 'template',
  ASSET: 'asset',
  AGENT: 'agent',
};

const slugToType = Object.fromEntries(
  Object.entries(typeToSlug).map(([prismaType, slug]) => [slug, prismaType]),
) as Record<MarketplaceItemDto['type'], MarketplaceItemType>;

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
): MarketplaceItemDto => {
  const rawSpecs =
    item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs)
      ? (item.specs as Record<string, unknown>)
      : {};

  // `previewUrl` is surfaced as a dedicated field (animated styles); every other
  // spec value is coerced to a string so the display contract stays a flat map
  // even when a TEXT_STYLE spec carries numeric fields (e.g. fontSize).
  const previewUrl =
    typeof rawSpecs.previewUrl === 'string' ? rawSpecs.previewUrl : undefined;
  const specs = Object.fromEntries(
    Object.entries(rawSpecs)
      .filter(([key]) => key !== 'previewUrl')
      .map(([key, value]) => [key, String(value)]),
  );

  return {
    id: item.id,
    slug: item.slug,
    type: typeToSlug[item.type],
    name: item.name,
    author: item.author,
    price: item.price,
    flag: item.flag,
    description: item.description,
    palette: Array.isArray(item.palette) ? (item.palette as string[]) : [],
    specs,
    includes: Array.isArray(item.includes) ? (item.includes as string[]) : [],
    refId: item.refId,
    owned,
    ...(previewUrl ? { previewUrl } : {}),
  };
};

@Injectable()
export class MarketplaceService {
  private readonly carouselTemplateService = new CarouselTemplateService();

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

  /**
   * Resolve the render spec of a TEXT_STYLE item by id or slug. Returns null
   * when the item is missing or its `specs` json does not match the contract.
   * Used by the cuts render pipeline to burn title/caption overlays.
   */
  async getTextStyleSpec(styleId: string): Promise<TextStyleSpec | null> {
    const item = await this.prisma.marketplaceItem.findFirst({
      where: { OR: [{ id: styleId }, { slug: styleId }] },
      select: { specs: true },
    });
    if (!item?.specs) return null;
    const parsed = textStyleSpecSchema.safeParse(item.specs);
    return parsed.success ? parsed.data : null;
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
    const where = { companyId: workspace.companyId };

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
      where: { companyId: workspace.companyId, itemId: item.id },
    });
    if (existing) {
      throw new UnprocessableEntityException('Item already owned');
    }

    if (item.price > 0) {
      await this.credits.checkBalance(workspace.companyId, item.price);
      await this.credits.debit(
        workspace.companyId,
        item.price,
        `Marketplace redeem: ${item.name}`,
      );
    }

    await this.prisma.workspaceEntitlement.create({
      data: {
        itemId: item.id,
        companyId: workspace.companyId,
        redeemedByUserId: userId,
      },
    });

    return serializeItem(item, true);
  }

  // ─── Admin (marketplace.manage) ──────────────────────────────────────────

  async listAllItems(): Promise<AdminMarketplaceItemDto[]> {
    const items = await this.prisma.marketplaceItem.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return items.map((item) => ({ ...serializeItem(item), isActive: item.isActive }));
  }

  async createItem(dto: UpsertMarketplaceItemDto): Promise<AdminMarketplaceItemDto> {
    const existing = await this.prisma.marketplaceItem.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new UnprocessableEntityException('Slug already in use');
    }
    this.validateTemplateRefId(dto.type, dto.refId);
    const item = await this.prisma.marketplaceItem.create({
      data: {
        slug: dto.slug,
        type: slugToType[dto.type],
        name: dto.name,
        author: dto.author,
        price: dto.price,
        flag: dto.flag ?? null,
        description: dto.description,
        palette: dto.palette,
        specs: dto.specs as Prisma.InputJsonValue,
        includes: dto.includes,
        refId: dto.refId ?? null,
        isActive: dto.isActive,
      },
    });
    return { ...serializeItem(item), isActive: item.isActive };
  }

  async updateItem(
    id: string,
    dto: UpdateMarketplaceItemDto,
  ): Promise<AdminMarketplaceItemDto> {
    await this.ensureItemExists(id);
    const nextType = dto.type;
    const nextRefId = dto.refId;
    if (nextType === 'template' || nextRefId !== undefined) {
      const current = await this.prisma.marketplaceItem.findUnique({
        where: { id },
        select: { type: true, refId: true },
      });
      const effectiveType = nextType ?? (current ? typeToSlug[current.type] : undefined);
      const effectiveRefId = nextRefId === undefined ? current?.refId : nextRefId;
      this.validateTemplateRefId(effectiveType, effectiveRefId);
    }
    const data: Prisma.MarketplaceItemUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.type !== undefined) data.type = slugToType[dto.type];
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.flag !== undefined) data.flag = dto.flag ?? null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.palette !== undefined) data.palette = dto.palette;
    if (dto.specs !== undefined) data.specs = dto.specs as Prisma.InputJsonValue;
    if (dto.includes !== undefined) data.includes = dto.includes;
    if (dto.refId !== undefined) data.refId = dto.refId ?? null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const item = await this.prisma.marketplaceItem.update({ where: { id }, data });
    return { ...serializeItem(item), isActive: item.isActive };
  }

  async setItemActive(
    id: string,
    isActive: boolean,
  ): Promise<AdminMarketplaceItemDto> {
    await this.ensureItemExists(id);
    const item = await this.prisma.marketplaceItem.update({
      where: { id },
      data: { isActive },
    });
    return { ...serializeItem(item), isActive: item.isActive };
  }

  private async ensureItemExists(id: string) {
    const item = await this.prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Marketplace item not found');
  }

  private validateTemplateRefId(
    type: MarketplaceItemDto['type'] | undefined,
    refId: string | null | undefined,
  ) {
    if (type !== 'template' || !refId) return;

    try {
      this.carouselTemplateService.getTemplate(refId);
    } catch (error) {
      if (error instanceof TemplateNotFoundError) {
        throw new UnprocessableEntityException(`Invalid carousel template refId: ${refId}`);
      }
      throw error;
    }
  }

  private async debitPersonalCredits(
    personalSpaceId: string,
    amount: number,
    description: string,
    userId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const balance = await tx.personalCreditBalance.findUnique({
        where: { personalSpaceId },
      });
      if (!balance) throw new NotFoundException('Credit balance not found');

      const newAmount = Number(balance.amount) - amount;
      if (newAmount < 0) {
        throw new UnprocessableEntityException('Insufficient credit balance');
      }

      await tx.personalCreditBalance.update({
        where: { personalSpaceId },
        data: { amount: newAmount },
      });

      await tx.personalCreditLedger.create({
        data: {
          personalSpaceId,
          type: 'DEBIT',
          amount,
          balanceAfter: newAmount,
          currency: balance.currency,
          description,
          createdByUserId: userId,
        },
      });
    });
  }
}
