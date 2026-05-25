import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { IngestDocumentDto } from '@company-os/types';
import { RagChunkingService } from './rag-chunking.service';
import { RagDocumentService } from './rag-document.service';
import { RagEmbeddingService } from './rag-embedding.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

export interface IndexResult {
  documentId: string;
  chunksCreated: number;
  isNew: boolean;
  skipped: boolean;
  jobId: string;
}

@Injectable()
export class RagIndexingService {
  private readonly logger = new Logger(RagIndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: RagDocumentService,
    private readonly chunkingService: RagChunkingService,
    private readonly embeddingService: RagEmbeddingService,
  ) {}

  async ingest(
    organizationId: string,
    dto: IngestDocumentDto,
    triggeredByUserId?: string,
  ): Promise<IndexResult> {
    const { id: documentId, isNew, shouldReindex } = await this.documentService.upsertDocument(
      organizationId,
      dto,
    );

    if (!shouldReindex) {
      return {
        documentId,
        chunksCreated: 0,
        isNew: false,
        skipped: true,
        jobId: '',
      };
    }

    const job = await this.prisma.ragIndexJob.create({
      data: {
        organizationId,
        documentId,
        status: 'running',
        triggeredByUserId,
        startedAt: new Date(),
      },
    });

    try {
      // Clear old embeddings before rechunking
      await this.embeddingService.deleteEmbeddingsForDocument(documentId);

      const chunks = await this.chunkingService.chunkDocument(
        documentId,
        dto.content,
        dto.metadata ?? {},
      );

      await this.embeddingService.embedChunks(
        organizationId,
        chunks.map((c) => ({ id: c.id, content: c.content })),
      );

      await this.documentService.markIndexed(documentId);

      await this.prisma.ragIndexJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      this.logger.log(
        `Indexed document ${documentId} — ${chunks.length} chunks (org: ${organizationId})`,
      );

      return {
        documentId,
        chunksCreated: chunks.length,
        isNew,
        skipped: false,
        jobId: job.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.documentService.markFailed(documentId, message);
      await this.prisma.ragIndexJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: message,
          completedAt: new Date(),
          metadata: toJsonValue({ error: message }),
        },
      });
      this.logger.error(`Indexing failed for document ${documentId}: ${message}`);
      throw error;
    }
  }

  async reindexScope(
    organizationId: string,
    options: { sourceType?: string; sourceIds?: string[] },
    triggeredByUserId?: string,
  ): Promise<{ queued: number }> {
    const docs = await this.prisma.ragDocument.findMany({
      where: {
        organizationId,
        ...(options.sourceType ? { sourceType: options.sourceType } : {}),
        ...(options.sourceIds?.length ? { sourceId: { in: options.sourceIds } } : {}),
        status: { not: 'archived' },
      },
      select: { id: true },
    });

    if (docs.length === 0) return { queued: 0 };

    // Mark all as pending so they'll be picked up by the indexing task
    await this.prisma.ragDocument.updateMany({
      where: { id: { in: docs.map((d) => d.id) } },
      data: { status: 'pending' },
    });

    // Create jobs
    await this.prisma.ragIndexJob.createMany({
      data: docs.map((d) => ({
        organizationId,
        documentId: d.id,
        status: 'queued',
        triggeredByUserId,
      })),
    });

    return { queued: docs.length };
  }
}
