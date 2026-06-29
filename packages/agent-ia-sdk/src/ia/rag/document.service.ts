import { createHash } from 'node:crypto';
import type { PrismaClient, RagDocument, Prisma } from '@company-os/db';
import type {
  RagSourceType,
  RagDocumentStatus,
} from '@company-os/types';

export interface CreateDocumentDto {
  companyId: string;
  sourceType: RagSourceType;
  sourceId: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentWithChunks extends RagDocument {
  chunks: Array<{
    id: string;
    chunkIndex: number;
    content: string;
    tokenCount: number | null;
  }>;
}

/** Document CRUD over the `RagDocument` table. Pure constructor injection. */
export class DocumentService {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<RagDocument | null> {
    return this.prisma.ragDocument.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<RagDocument> {
    const doc = await this.findById(id);
    if (!doc) throw new Error('Document not found');
    return doc;
  }

  async findBySource(
    companyId: string,
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<RagDocument | null> {
    return this.prisma.ragDocument.findFirst({
      where: { companyId, sourceType, sourceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithChunks(id: string): Promise<DocumentWithChunks | null> {
    return this.prisma.ragDocument.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: { id: true, chunkIndex: true, content: true, tokenCount: true },
        },
      },
    });
  }

  async create(dto: CreateDocumentDto): Promise<RagDocument> {
    const contentHash = this.hashContent(dto.content);

    const existing = await this.prisma.ragDocument.findUnique({
      where: {
        companyId_sourceType_sourceId_contentHash: {
          companyId: dto.companyId,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          contentHash,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.ragDocument.create({
      data: {
        companyId: dto.companyId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        title: dto.title,
        contentHash,
        status: 'PENDING',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async updateStatus(id: string, status: RagDocumentStatus): Promise<RagDocument> {
    return this.prisma.ragDocument.update({ where: { id }, data: { status } });
  }

  async deleteBySource(
    companyId: string,
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<number> {
    const result = await this.prisma.ragDocument.deleteMany({
      where: { companyId, sourceType, sourceId },
    });
    return result.count;
  }

  async deleteByCompany(companyId: string): Promise<number> {
    const result = await this.prisma.ragDocument.deleteMany({
      where: { companyId },
    });
    return result.count;
  }

  async listByCompany(
    companyId: string,
    options?: {
      sourceType?: RagSourceType;
      status?: RagDocumentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ documents: RagDocument[]; total: number }> {
    const where: Prisma.RagDocumentWhereInput = { companyId };
    if (options?.sourceType) where.sourceType = options.sourceType;
    if (options?.status) where.status = options.status;

    const [documents, total] = await Promise.all([
      this.prisma.ragDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.ragDocument.count({ where }),
    ]);

    return { documents, total };
  }

  async getStats(companyId: string): Promise<{
    totalDocuments: number;
    byStatus: Record<string, number>;
    bySourceType: Record<string, number>;
  }> {
    const [totalDocuments, statusCounts, sourceCounts] = await Promise.all([
      this.prisma.ragDocument.count({ where: { companyId } }),
      this.prisma.ragDocument.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
      this.prisma.ragDocument.groupBy({
        by: ['sourceType'],
        where: { companyId },
        _count: { sourceType: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      byStatus[item.status] = item._count.status;
    }

    const bySourceType: Record<string, number> = {};
    for (const item of sourceCounts) {
      bySourceType[item.sourceType] = item._count.sourceType;
    }

    return { totalDocuments, byStatus, bySourceType };
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 32);
  }
}
