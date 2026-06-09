import { Injectable, Logger } from '@nestjs/common';
import type { IngestDocumentDto, RagSourceType } from '@company-os/types';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentService } from './document.service';
import { ChunkService } from './chunk.service';
import { EmbeddingRepository } from './embedding.repository';
import type { RagDocument, Prisma } from '../generated/prisma';
import {
  hashRagContent,
  serializeBrandBrain,
  serializeCampaign,
  type BrandBrainSerializeInput,
} from './brand-brain.serializer';

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  embeddingsCreated: number;
  status: 'created' | 'updated' | 'skipped';
}

export type BrandBrainContent = BrandBrainSerializeInput;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly chunkService: ChunkService,
    private readonly embeddingRepository: EmbeddingRepository,
  ) {}

  async ingest(dto: IngestDocumentDto): Promise<IngestResult> {
    this.logger.debug(`Ingesting document: ${dto.sourceType}/${dto.sourceId}`);

    const existing = await this.documentService.findBySource(
      dto.companyId,
      dto.sourceType,
      dto.sourceId,
    );

    if (existing && !dto.forceReindex) {
      const contentHash = hashRagContent(dto.content);
      if ((existing.metadata as { contentHash?: string })?.contentHash === contentHash) {
        this.logger.debug(`Document unchanged, skipping: ${existing.id}`);
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
      campaignId: dto.campaignId,
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
          campaignId: dto.campaignId,
          agentId: dto.agentId,
          metadata: dto.metadata,
        },
      );

      const embeddingsCreated = await this.embeddingRepository.createEmbeddingsForChunks(
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
      this.logger.error(`Ingestion failed for ${document.id}`, error);
      throw error;
    }
  }

  async ingestBrandBrain(
    companyId: string,
    brandProfileId: string,
    content: BrandBrainContent,
  ): Promise<IngestResult> {
    const textContent = serializeBrandBrain(content);

    return this.ingest({
      companyId,
      sourceType: 'BRAND_BRAIN',
      sourceId: brandProfileId,
      title: 'Cérebro da Marca',
      content: textContent,
      forceReindex: true,
      metadata: {
        brandProfileId,
        fields: Object.keys(content).filter(
          (k) => content[k as keyof BrandBrainContent],
        ),
      },
    });
  }

  async ingestCampaign(
    companyId: string,
    campaignId: string,
    name: string,
    objective: string,
    context?: string | null,
  ): Promise<IngestResult> {
    const textContent = serializeCampaign({ name, objective, context });

    return this.ingest({
      companyId,
      sourceType: 'CAMPAIGN',
      sourceId: campaignId,
      campaignId,
      title: `Campanha: ${name}`,
      content: textContent,
      forceReindex: true,
    });
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

    if (!job) {
      this.logger.warn(`Job not found: ${jobId}`);
      return;
    }

    if (job.status !== 'PENDING') {
      this.logger.debug(`Job already processed: ${jobId}`);
      return;
    }

    await this.prisma.ragIndexJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } },
    });

    try {
      if (job.document) {
        const chunks = await this.chunkService.getChunksByDocument(job.document.id);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
