import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BulkUpdateAssetsDto, CreateAssetDto, ListAssetsDto, UpdateAssetDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAsset(organizationId: string, dto: CreateAssetDto) {
    const relations = dto.relations ?? [];

    return this.prisma.asset.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        sourceKind: dto.sourceKind,
        sourceUrl: dto.sourceUrl,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        visibleType: dto.visibleType,
        visibleCategory: dto.visibleCategory,
        tags: dto.tags,
        contextRole: dto.contextRole,
        operationalRole: dto.operationalRole,
        contextStatus: dto.contextRole ? 'uploaded' : null,
        operationalStatus: dto.operationalRole ? 'active' : null,
        relations: relations.length
          ? {
              create: relations.map((relation) => ({
                kind: relation.kind,
                value: relation.value,
              })),
            }
          : undefined,
      },
      include: { relations: true },
    });
  }

  async listAssets(organizationId: string, filters: ListAssetsDto) {
    return this.prisma.asset.findMany({
      where: {
        organizationId,
        ...(filters.role === 'context' ? { contextRole: true } : {}),
        ...(filters.role === 'operational' ? { operationalRole: true } : {}),
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters.contextStatus ? { contextStatus: filters.contextStatus } : {}),
        ...(filters.operationalStatus ? { operationalStatus: filters.operationalStatus } : {}),
      },
      include: { relations: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getAssetById(organizationId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      include: { relations: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async updateAsset(organizationId: string, assetId: string, dto: UpdateAssetDto) {
    await this.getAssetById(organizationId, assetId);

    const relations = dto.relations;

    if (!relations) {
      return this.prisma.asset.update({
        where: { id: assetId },
        data: {
          title: dto.title,
          description: dto.description,
          visibleType: dto.visibleType,
          visibleCategory: dto.visibleCategory,
          tags: dto.tags,
          contextRole: dto.contextRole,
          operationalRole: dto.operationalRole,
          contextStatus: dto.contextStatus,
          operationalStatus: dto.operationalStatus,
        },
        include: { relations: true },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.assetRelation.deleteMany({ where: { assetId } });

      return tx.asset.update({
        where: { id: assetId },
        data: {
          title: dto.title,
          description: dto.description,
          visibleType: dto.visibleType,
          visibleCategory: dto.visibleCategory,
          tags: dto.tags,
          contextRole: dto.contextRole,
          operationalRole: dto.operationalRole,
          contextStatus: dto.contextStatus,
          operationalStatus: dto.operationalStatus,
          relations: {
            create: relations.map((relation) => ({
              kind: relation.kind,
              value: relation.value,
            })),
          },
        },
        include: { relations: true },
      });
    });
  }

  async bulkUpdateAssets(organizationId: string, dto: BulkUpdateAssetsDto) {
    if (dto.action === 'replace_relations') {
      return this.prisma.$transaction(async (tx) => {
        const assets = await tx.asset.findMany({
          where: { id: { in: dto.assetIds }, organizationId },
          select: { id: true },
        });

        if (assets.length !== dto.assetIds.length) {
          throw new NotFoundException('One or more assets were not found');
        }

        const verifiedAssetIds = assets.map((asset) => asset.id);

        await tx.assetRelation.deleteMany({ where: { assetId: { in: verifiedAssetIds } } });

        for (const assetId of verifiedAssetIds) {
          await tx.asset.update({
            where: { id: assetId },
            data: {
              relations: {
                create: (dto.relations ?? []).map((relation) => ({
                  kind: relation.kind,
                  value: relation.value,
                })),
              },
            },
          });
        }

        return { count: dto.assetIds.length };
      });
    }

    const dataByAction = {
      archive: { operationalStatus: 'archived' },
      mark_obsolete: { operationalStatus: 'obsolete' },
      approve_context: { contextStatus: 'approved' },
      discard_context: { contextStatus: 'discarded' },
      promote_to_context: { contextRole: true, contextStatus: 'uploaded' },
    } as const;

    return this.prisma.asset.updateMany({
      where: { id: { in: dto.assetIds }, organizationId },
      data: dataByAction[dto.action],
    });
  }
}
