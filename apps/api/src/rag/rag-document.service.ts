import { createHash } from 'node:crypto';
import type { IngestDocumentDto } from '@company-os/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

@Injectable()
export class RagDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDocument(
    organizationId: string,
    dto: IngestDocumentDto,
  ): Promise<{ id: string; isNew: boolean; shouldReindex: boolean }> {
    const contentHash = createHash('sha256').update(dto.content).digest('hex');

    const existing = dto.sourceId
      ? await this.prisma.ragDocument.findUnique({
          where: {
            organizationId_sourceType_sourceId: {
              organizationId,
              sourceType: dto.sourceType,
              sourceId: dto.sourceId,
            },
          },
          select: { id: true, contentHash: true, status: true },
        })
      : null;

    if (existing) {
      const contentChanged = existing.contentHash !== contentHash;
      const shouldReindex = dto.forceReindex || contentChanged;

      await this.prisma.ragDocument.update({
        where: { id: existing.id },
        data: {
          title: dto.title,
          contentHash,
          status: shouldReindex ? 'pending' : existing.status,
          metadata: toJsonValue(dto.metadata ?? {}),
        },
      });

      return { id: existing.id, isNew: false, shouldReindex };
    }

    const doc = await this.prisma.ragDocument.create({
      data: {
        organizationId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        title: dto.title,
        contentHash,
        status: 'pending',
        metadata: toJsonValue(dto.metadata ?? {}),
      },
    });

    return { id: doc.id, isNew: true, shouldReindex: true };
  }

  async getDocument(organizationId: string, documentId: string) {
    const doc = await this.prisma.ragDocument.findFirst({
      where: { id: documentId, organizationId },
      include: { chunks: { orderBy: { sequence: 'asc' } } },
    });
    if (!doc) throw new NotFoundException('RAG document not found');
    return doc;
  }

  async listDocuments(
    organizationId: string,
    options: { sourceType?: string; status?: string } = {},
  ) {
    return this.prisma.ragDocument.findMany({
      where: {
        organizationId,
        ...(options.sourceType ? { sourceType: options.sourceType } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async archiveDocument(organizationId: string, documentId: string) {
    const doc = await this.prisma.ragDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('RAG document not found');

    return this.prisma.ragDocument.update({
      where: { id: documentId },
      data: { status: 'archived' },
    });
  }

  async markIndexed(documentId: string) {
    return this.prisma.ragDocument.update({
      where: { id: documentId },
      data: { status: 'indexed' },
    });
  }

  async markFailed(documentId: string, error: string) {
    return this.prisma.ragDocument.update({
      where: { id: documentId },
      data: {
        status: 'failed',
        metadata: toJsonValue({ lastError: error, failedAt: new Date().toISOString() }),
      },
    });
  }

  async getPendingDocuments(organizationId: string, limit = 20) {
    return this.prisma.ragDocument.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }
}
