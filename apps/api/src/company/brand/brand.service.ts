import {
  normalizeBrandAssets,
  normalizeBrandPalette,
  normalizeLogoVariants,
  type BrandAsset,
  type LogoVariant,
  type LogoVariants,
} from '@company-os/types';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  isKeyInCompanyScope,
  isKeyInPendingScope,
} from '../../storage/storage-path.util';
import type { z } from 'zod';
import type {
  addBrandAssetBodySchema,
  updateBrandBodySchema,
  updateLogoBodySchema,
} from './dto/brand.dto';
import type { Prisma } from '../../generated/prisma';

export const RAG_EVENTS_SERVICE = 'RAG_EVENTS_SERVICE';

export interface RagEventsServiceInterface {
  triggerBrandBrainIndex(companyId: string, brandProfileId: string): Promise<string>;
  triggerCompanySync(companyId: string, options?: { campaignId?: string }): Promise<string>;
}

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() @Inject(RAG_EVENTS_SERVICE) private readonly ragEvents?: RagEventsServiceInterface,
  ) {}

  async findByCompanyId(companyId: string) {
    const profile = await this.prisma.brandProfile.findUnique({
      where: { companyId },
    });
    if (!profile) return null;
    return this.serialize(profile);
  }

  async findByCompanyIdOrThrow(companyId: string) {
    const profile = await this.findByCompanyId(companyId);
    if (!profile) throw new NotFoundException('Brand profile not found');
    return profile;
  }

  async update(
    companyId: string,
    actorUserId: string,
    dto: z.infer<typeof updateBrandBodySchema>,
  ) {
    const profile = await this.findByCompanyIdOrThrow(companyId);
    const data: Prisma.BrandProfileUpdateInput = {};
    if (dto.brandVoice !== undefined) data.brandVoice = dto.brandVoice;
    if (dto.palette !== undefined) data.palette = dto.palette;
    if (dto.typography !== undefined) data.typography = dto.typography;
    if (dto.visualStyle !== undefined) data.visualStyle = dto.visualStyle;
    if (dto.niche !== undefined) data.niche = dto.niche;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.targetAudience !== undefined) data.targetAudience = dto.targetAudience;
    if (dto.marketingObjective !== undefined) {
      data.marketingObjective = dto.marketingObjective;
    }
    if (dto.socialNetworks !== undefined) data.socialNetworks = dto.socialNetworks;
    if (dto.mainProducts !== undefined) data.mainProducts = dto.mainProducts;
    if (dto.differentiators !== undefined) {
      data.differentiators = dto.differentiators;
    }

    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data,
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.update',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
      metadata: dto as Record<string, unknown>,
    });

    await this.triggerRagIndexing(companyId, profile.id);

    return this.serialize(updated);
  }

  private async triggerRagIndexing(companyId: string, brandProfileId: string): Promise<void> {
    if (!this.ragEvents) return;

    try {
      if (this.ragEvents.triggerCompanySync) {
        await this.ragEvents.triggerCompanySync(companyId);
        return;
      }

      await this.ragEvents.triggerBrandBrainIndex(companyId, brandProfileId);
    } catch (error) {
      console.error('Failed to trigger RAG sync for company', error);
    }
  }

  async updateLogo(
    companyId: string,
    companySlug: string,
    ownerUserId: string,
    actorUserId: string,
    dto: z.infer<typeof updateLogoBodySchema>,
  ) {
    this.assertStorageKeyForLogo(
      dto.logoStorageKey,
      companySlug,
      ownerUserId,
      dto.variant,
    );

    const profile = await this.findByCompanyIdOrThrow(companyId);
    const currentVariants = normalizeLogoVariants(profile.logoVariants);
    const nextVariants: LogoVariants = {
      ...currentVariants,
      [dto.variant]: dto.logoStorageKey,
    };

    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data: {
        logoVariants: nextVariants,
        ...(dto.variant === 'primary'
          ? { logoStorageKey: dto.logoStorageKey }
          : {}),
      },
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.logo_updated',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
      metadata: { variant: dto.variant },
    });

    await this.triggerRagIndexing(companyId, profile.id);

    return this.serialize(updated);
  }

  async addAsset(
    companyId: string,
    companySlug: string,
    ownerUserId: string,
    actorUserId: string,
    dto: z.infer<typeof addBrandAssetBodySchema>,
  ) {
    this.assertStorageKeyForAsset(dto.storageKey, companySlug, ownerUserId);

    const profile = await this.findByCompanyIdOrThrow(companyId);
    const assets = normalizeBrandAssets(profile.brandAssets);
    const nextAsset: BrandAsset = {
      id: randomUUID(),
      name: dto.name ?? this.extractAssetName(dto.storageKey),
      storageKey: dto.storageKey,
      mimeType: dto.mimeType,
      createdAt: new Date().toISOString(),
    };

    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data: { brandAssets: [...assets, nextAsset] },
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.asset_added',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
      metadata: { assetId: nextAsset.id },
    });

    await this.triggerRagIndexing(companyId, profile.id);

    return this.serialize(updated);
  }

  async removeAsset(
    companyId: string,
    actorUserId: string,
    assetId: string,
  ) {
    const profile = await this.findByCompanyIdOrThrow(companyId);
    const assets = normalizeBrandAssets(profile.brandAssets);
    const nextAssets = assets.filter((asset) => asset.id !== assetId);
    if (nextAssets.length === assets.length) {
      throw new NotFoundException('Asset not found');
    }

    const updated = await this.prisma.brandProfile.update({
      where: { companyId },
      data: { brandAssets: nextAssets },
    });
    await this.audit.write({
      actorUserId,
      action: 'brand.asset_removed',
      resourceType: 'BrandProfile',
      resourceId: profile.id,
      metadata: { assetId },
    });

    await this.triggerRagIndexing(companyId, profile.id);

    return this.serialize(updated);
  }

  private assertStorageKeyForLogo(
    storageKey: string,
    companySlug: string,
    ownerUserId: string,
    variant: LogoVariant,
  ) {
    const inCompanyScope =
      isKeyInCompanyScope(storageKey, companySlug) &&
      storageKey.includes(`/logos/${variant}/`);
    const inPendingScope =
      isKeyInPendingScope(storageKey, ownerUserId) &&
      storageKey.includes(`/logos/${variant}/`);

    if (!inCompanyScope && !inPendingScope) {
      throw new BadRequestException('Invalid logo storage key');
    }
  }

  private assertStorageKeyForAsset(
    storageKey: string,
    companySlug: string,
    ownerUserId: string,
  ) {
    const inCompanyScope =
      isKeyInCompanyScope(storageKey, companySlug) &&
      storageKey.includes('/assets/');
    const inPendingScope =
      isKeyInPendingScope(storageKey, ownerUserId) &&
      storageKey.includes('/assets/');

    if (!inCompanyScope && !inPendingScope) {
      throw new BadRequestException('Invalid asset storage key');
    }
  }

  private extractAssetName(storageKey: string) {
    const parts = storageKey.split('/');
    return parts[parts.length - 1] ?? 'Asset';
  }

  private serialize(
    profile: NonNullable<
      Awaited<ReturnType<typeof this.prisma.brandProfile.findUnique>>
    >,
  ) {
    const logoVariants = normalizeLogoVariants(profile.logoVariants);
    const legacyPrimary = profile.logoStorageKey?.trim() || null;

    if (legacyPrimary && !logoVariants.primary) {
      logoVariants.primary = legacyPrimary;
    }

    return {
      ...profile,
      palette: normalizeBrandPalette(profile.palette),
      logoVariants,
      brandAssets: normalizeBrandAssets(profile.brandAssets),
      logoStorageKey: logoVariants.primary ?? legacyPrimary,
    };
  }
}
