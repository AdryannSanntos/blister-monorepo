import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContextSyncService } from './context-sync.service';
import type {
  CreateContextSourceDto,
  CreateContextUploadUrlDto,
  ListContextSourcesDto,
  ReviewContextSourceDto,
  UpdateContextSourceDto,
} from './dto';

@Injectable()
export class ContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly syncService: ContextSyncService,
  ) {}

  async createUploadUrl(organizationId: string, dto: CreateContextUploadUrlDto) {
    const tempId = randomUUID();
    const key = this.storage.buildContextSourceKey(organizationId, tempId, dto.fileName);
    const { url } = await this.storage.createPresignedUploadUrl({
      key,
      contentType: dto.contentType,
      size: dto.size,
      expiresInSeconds: 900,
    });
    const publicUrl = this.storage.buildPublicObjectUrl(key);
    return { uploadUrl: url, objectKey: key, publicUrl };
  }

  async uploadSourceFile(
    organizationId: string,
    input: { fileName: string; contentType: string; size: number; body: Buffer },
  ) {
    const tempId = randomUUID();
    const objectKey = this.storage.buildContextSourceKey(organizationId, tempId, input.fileName);

    await this.storage.putObject({
      key: objectKey,
      body: input.body,
      contentType: input.contentType,
    });

    return {
      objectKey,
      publicUrl: this.storage.buildPublicObjectUrl(objectKey),
    };
  }

  async create(organizationId: string, dto: CreateContextSourceDto, userId: string) {
    const source = await this.prisma.contextSource.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        sourceKind: dto.sourceKind,
        sourceUrl: dto.sourceUrl,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        objectKey: dto.objectKey,
        publicUrl: dto.publicUrl,
        tags: dto.tags,
        category: dto.category,
        pipelineStatus: dto.sourceKind === 'url' ? 'review' : 'pending',
      },
    });

    if (dto.sourceKind !== 'url') {
      await this.syncService.enqueueSourceIngest(organizationId, source.id);
    }
    return source;
  }

  async list(organizationId: string, filters: ListContextSourcesDto) {
    const where: Record<string, unknown> = { organizationId };

    if (filters.status) {
      where['pipelineStatus'] = filters.status;
    }
    if (filters.sourceKind) {
      where['sourceKind'] = filters.sourceKind;
    }
    if (filters.category) {
      where['category'] = filters.category;
    }
    if (filters.search) {
      where['OR'] = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contextSource.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(organizationId: string, sourceId: string) {
    const source = await this.prisma.contextSource.findFirst({
      where: { id: sourceId, organizationId },
    });
    if (!source) throw new NotFoundException('Context source not found');
    return source;
  }

  async update(organizationId: string, sourceId: string, dto: UpdateContextSourceDto) {
    await this.getById(organizationId, sourceId);
    return this.prisma.contextSource.update({
      where: { id: sourceId },
      data: dto,
    });
  }

  async review(organizationId: string, sourceId: string, dto: ReviewContextSourceDto, userId: string) {
    const source = await this.getById(organizationId, sourceId);

    if (!['review', 'approved', 'rejected'].includes(source.pipelineStatus)) {
      throw new NotFoundException('Source is not ready for review');
    }

    const updated = await this.prisma.contextSource.update({
      where: { id: sourceId },
      data: {
        pipelineStatus: dto.decision === 'approve' ? 'approved' : 'rejected',
        reviewNotes: dto.reviewNotes,
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    if (dto.decision === 'approve') {
      await this.syncService.enqueueArtifactSync(organizationId);
    }

    return updated;
  }

  async delete(organizationId: string, sourceId: string) {
    const source = await this.getById(organizationId, sourceId);

    if (source.objectKey) {
      try {
        await this.storage.deleteObject(source.objectKey);
      } catch {
        // best-effort
      }
    }

    await this.prisma.contextSource.delete({ where: { id: sourceId } });
    return { deleted: true };
  }

  async getArtifact(organizationId: string) {
    return this.prisma.contextArtifact.findUnique({ where: { organizationId } });
  }

  async triggerArtifactSync(organizationId: string) {
    await this.syncService.enqueueArtifactSync(organizationId);
    return this.prisma.contextArtifact.upsert({
      where: { organizationId },
      create: { organizationId, syncStatus: 'syncing' },
      update: { syncStatus: 'syncing', syncError: null },
    });
  }
}
