import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DesignSystemSyncService } from './design-system-sync.service';
import type {
  CreateColorGroupDto,
  CreateColorTokenDto,
  CreateDesignAssetDto,
  CreateUploadUrlDto,
  UpdateColorGroupDto,
  UpdateColorTokenDto,
  UpdateDesignAssetDto,
  UpdateDesignIdentityDto,
} from './dto';

@Injectable()
export class DesignSystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: DesignSystemSyncService,
    private readonly storage: StorageService,
  ) {}

  private get includeGraph() {
    return {
      colorGroups: { include: { colors: { orderBy: { sortOrder: 'asc' as const } } }, orderBy: { sortOrder: 'asc' as const } },
      assets: { orderBy: { updatedAt: 'desc' as const } },
    };
  }

  private async ensureProfile(organizationId: string) {
    return this.prisma.designSystemProfile.upsert({
      where: { organizationId },
      create: { organizationId },
      update: {},
      include: this.includeGraph,
    });
  }

  async getDesignSystem(organizationId: string) {
    return this.ensureProfile(organizationId);
  }

  async updateIdentity(organizationId: string, dto: UpdateDesignIdentityDto) {
    await this.ensureProfile(organizationId);
    const updated = await this.prisma.designSystemProfile.update({
      where: { organizationId },
      data: dto,
      include: this.includeGraph,
    });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return updated;
  }

  async createColorGroup(organizationId: string, dto: CreateColorGroupDto) {
    const profile = await this.ensureProfile(organizationId);
    const created = await this.prisma.designColorGroup.create({
      data: { ...dto, designSystemId: profile.id },
      include: { colors: true },
    });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return created;
  }

  private async findColorGroup(organizationId: string, colorGroupId: string) {
    const group = await this.prisma.designColorGroup.findFirst({
      where: { id: colorGroupId, designSystem: { organizationId } },
      include: { colors: true },
    });
    if (!group) throw new NotFoundException('Color group not found');
    return group;
  }

  async updateColorGroup(organizationId: string, colorGroupId: string, dto: UpdateColorGroupDto) {
    await this.findColorGroup(organizationId, colorGroupId);
    const updated = await this.prisma.designColorGroup.update({
      where: { id: colorGroupId },
      data: dto,
      include: { colors: true },
    });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return updated;
  }

  async deleteColorGroup(organizationId: string, colorGroupId: string) {
    await this.findColorGroup(organizationId, colorGroupId);
    await this.prisma.designColorGroup.delete({ where: { id: colorGroupId } });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return { deleted: true };
  }

  async createColorToken(organizationId: string, dto: CreateColorTokenDto) {
    await this.findColorGroup(organizationId, dto.colorGroupId);
    const created = await this.prisma.designColorToken.create({ data: dto });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return created;
  }

  private async findColorToken(organizationId: string, colorTokenId: string) {
    const token = await this.prisma.designColorToken.findFirst({
      where: { id: colorTokenId, colorGroup: { designSystem: { organizationId } } },
    });
    if (!token) throw new NotFoundException('Color token not found');
    return token;
  }

  async updateColorToken(organizationId: string, colorTokenId: string, dto: UpdateColorTokenDto) {
    await this.findColorToken(organizationId, colorTokenId);
    const updated = await this.prisma.designColorToken.update({ where: { id: colorTokenId }, data: dto });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return updated;
  }

  async deleteColorToken(organizationId: string, colorTokenId: string) {
    await this.findColorToken(organizationId, colorTokenId);
    await this.prisma.designColorToken.delete({ where: { id: colorTokenId } });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return { deleted: true };
  }

  async createAssetUploadUrl(organizationId: string, dto: CreateUploadUrlDto) {
    const key = this.storage.buildDesignAssetKey(organizationId, dto.primaryRole, dto.fileName);
    const { url } = await this.storage.createPresignedUploadUrl({
      key,
      contentType: dto.contentType,
      size: dto.size,
    });
    return { key, url }; 
  }

  async uploadAssetFile(
    organizationId: string,
    input: {
      primaryRole: CreateUploadUrlDto['primaryRole'];
      fileName: string;
      contentType: string;
      size: number;
      body: Buffer;
    },
  ) {
    const key = this.storage.buildDesignAssetKey(organizationId, input.primaryRole, input.fileName);

    await this.storage.putObject({
      key,
      body: input.body,
      contentType: input.contentType,
    });

    return {
      key,
      publicUrl: this.storage.buildPublicObjectUrl(key),
    };
  }

  async createAsset(organizationId: string, dto: CreateDesignAssetDto) {
    const profile = await this.ensureProfile(organizationId);
    const publicUrl = dto.publicUrl ?? (dto.contentType.startsWith('image/') ? this.storage.buildPublicObjectUrl(dto.objectKey) : undefined);
    const created = await this.prisma.designAsset.create({
      data: { ...dto, publicUrl, organizationId, designSystemId: profile.id },
    });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return created;
  }

  private async findAsset(organizationId: string, assetId: string) {
    const asset = await this.prisma.designAsset.findFirst({ where: { id: assetId, organizationId } });
    if (!asset) throw new NotFoundException('Design asset not found');
    return asset;
  }

  async updateAsset(organizationId: string, assetId: string, dto: UpdateDesignAssetDto) {
    await this.findAsset(organizationId, assetId);
    const updated = await this.prisma.designAsset.update({ where: { id: assetId }, data: dto });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return updated;
  }

  async deleteAsset(organizationId: string, assetId: string) {
    const asset = await this.findAsset(organizationId, assetId);
    await this.storage.deleteObject(asset.objectKey);
    await this.prisma.designAsset.delete({ where: { id: assetId } });
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return { deleted: true };
  }

  async regenerateArtifact(organizationId: string) {
    await this.ensureProfile(organizationId);
    await this.syncService.enqueueDesignSystemSync(organizationId);
    return { status: 'pending' };
  }
}
