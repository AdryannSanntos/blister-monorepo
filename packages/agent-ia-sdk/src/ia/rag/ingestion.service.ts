import { createHash } from 'node:crypto';
import type { PrismaClient } from '@company-os/db';
import type {
  IngestDocumentDto,
  RagSourceType,
} from '@company-os/types';
import type { DocumentService } from './document.service';
import type { ChunkService } from './chunk.service';
import type { EmbeddingRepository } from './embedding.repository';

const hashRagContent = (content: string): string =>
  createHash('sha256').update(content).digest('hex').slice(0, 32);

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  embeddingsCreated: number;
  status: 'created' | 'updated' | 'skipped';
}

export interface IngestionServiceDeps {
  prisma: PrismaClient;
  documentService: DocumentService;
  chunkService: ChunkService;
  embeddingRepository: EmbeddingRepository;
}

/** Ingestion pipeline: dedupe → chunk → embed → mark indexed. */
export class IngestionService {
  private readonly prisma: PrismaClient;
  private readonly documentService: DocumentService;
  private readonly chunkService: ChunkService;
  private readonly embeddingRepository: EmbeddingRepository;

  constructor(deps: IngestionServiceDeps) {
    this.prisma = deps.prisma;
    this.documentService = deps.documentService;
    this.chunkService = deps.chunkService;
    this.embeddingRepository = deps.embeddingRepository;
  }

  async ingest(dto: IngestDocumentDto): Promise<IngestResult> {
    const existing = await this.documentService.findBySource(
      dto.companyId,
      dto.sourceType,
      dto.sourceId,
    );

    if (existing && !dto.forceReindex) {
      const contentHash = hashRagContent(dto.content);
      if (
        (existing.metadata as { contentHash?: string })?.contentHash ===
        contentHash
      ) {
        return {
          documentId: existing.id,
          chunksCreated: 0,
          embeddingsCreated: 0,
          status: 'skipped',
        };
      }
    }

    if (existing) {
      await this.documentService.deleteBySource(
        dto.companyId,
        dto.sourceType,
        dto.sourceId,
      );
    }

    const document = await this.documentService.create({
      companyId: dto.companyId,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      title: dto.title,
      content: dto.content,
      metadata: {
        ...dto.metadata,
        contentHash: hashRagContent(dto.content),
      },
    });

    await this.documentService.updateStatus(document.id, 'INDEXING');

    try {
      const chunks = await this.chunkService.chunkAndStore(
        document.id,
        dto.companyId,
        dto.content,
        {
          agentId: dto.agentId,
          metadata: dto.metadata,
        },
      );

      const embeddingsCreated =
        await this.embeddingRepository.createEmbeddingsForChunks(
          chunks.map((c) => ({ id: c.id, content: c.content })),
        );

      await this.documentService.updateStatus(document.id, 'INDEXED');

      return {
        documentId: document.id,
        chunksCreated: chunks.length,
        embeddingsCreated,
        status: existing ? 'updated' : 'created',
      };
    } catch (error) {
      await this.documentService.updateStatus(document.id, 'FAILED');
      throw error;
    }
  }

  async ingestAgentLearning(
    companyId: string,
    agentRunId: string,
    agentId: string,
    approved: boolean,
    output: Record<string, unknown>,
    feedback?: string,
  ): Promise<IngestResult> {
    const textContent = this.serializeAgentLearning(
      agentId,
      approved,
      output,
      feedback,
    );

    return this.ingest({
      companyId,
      sourceType: 'AGENT_LEARNING',
      sourceId: agentRunId,
      title: `Aprendizado: ${agentId}`,
      content: textContent,
      agentId,
      forceReindex: true,
      metadata: {
        agentRunId,
        agentId,
        approved,
        hasFeedback: !!feedback,
      },
    });
  }

  async deleteBySource(
    companyId: string,
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<number> {
    return this.documentService.deleteBySource(companyId, sourceType, sourceId);
  }

  async createIndexJob(
    companyId: string,
    documentId?: string,
    scheduledAt?: Date,
  ): Promise<string> {
    const job = await this.prisma.ragIndexJob.create({
      data: {
        companyId,
        documentId,
        status: 'PENDING',
        scheduledAt: scheduledAt ?? new Date(),
      },
    });
    return job.id;
  }

  async processIndexJob(jobId: string): Promise<void> {
    const job = await this.prisma.ragIndexJob.findUnique({
      where: { id: jobId },
      include: { document: true },
    });

    if (!job || job.status !== 'PENDING') return;

    await this.prisma.ragIndexJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      if (job.document) {
        const chunks = await this.chunkService.getChunksByDocument(
          job.document.id,
        );
        await this.embeddingRepository.createEmbeddingsForChunks(
          chunks.map((c) => ({ id: c.id, content: c.content })),
        );
        await this.documentService.updateStatus(job.document.id, 'INDEXED');
      }

      await this.prisma.ragIndexJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.prisma.ragIndexJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage },
      });
      throw error;
    }
  }

  private serializeAgentLearning(
    agentId: string,
    approved: boolean,
    output: Record<string, unknown>,
    feedback?: string,
  ): string {
    const status = approved ? 'Aprovado' : 'Rejeitado';
    let content = `# Aprendizado do Agente: ${agentId}\n\nStatus: ${status}`;
    if (feedback) {
      content += `\n\n## Feedback\n${feedback}`;
    }
    content += `\n\n## Output\n${JSON.stringify(output, null, 2)}`;
    return content;
  }
}
