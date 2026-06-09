import { Injectable, Logger } from '@nestjs/common';
import type {
  RagContextPack,
  RagRetrievedChunk,
  BuildContextPackRequest,
} from '@company-os/types';
import { RetrievalService } from './retrieval.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma';

export interface ContextPackOptions {
  companyId: string;
  query: string;
  agentId?: string;
  campaignId?: string;
  limit?: number;
  includeBrandBrain?: boolean;
  includeAgentLearning?: boolean;
  includeCampaignContext?: boolean;
}

@Injectable()
export class ContextPackService {
  private readonly logger = new Logger(ContextPackService.name);

  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly prisma: PrismaService,
  ) {}

  async buildPack(options: ContextPackOptions): Promise<RagContextPack> {
    const {
      companyId,
      query,
      agentId,
      campaignId,
      limit = 8,
      includeBrandBrain = true,
      includeAgentLearning = true,
      includeCampaignContext = true,
    } = options;

    this.logger.debug(
      `Building context pack for company ${companyId}, agent ${agentId ?? 'none'}`,
    );

    const chunks: RagRetrievedChunk[] = [];
    const promises: Promise<RagRetrievedChunk[]>[] = [];

    if (includeBrandBrain) {
      promises.push(
        this.retrievalService.searchBrandBrain(companyId, query, Math.ceil(limit / 2)),
      );
    }

    if (includeAgentLearning && agentId) {
      promises.push(
        this.retrievalService.searchAgentLearning(
          companyId,
          query,
          agentId,
          Math.ceil(limit / 3),
        ),
      );
    }

    if (includeCampaignContext && campaignId) {
      promises.push(
        this.retrievalService.searchCampaignContext(
          companyId,
          campaignId,
          query,
          Math.ceil(limit / 3),
        ),
      );
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      chunks.push(...result);
    }

    const uniqueChunks = this.deduplicateChunks(chunks);
    const sortedChunks = uniqueChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      query,
      companyId,
      chunks: sortedChunks,
      totalFound: uniqueChunks.length,
      agentId,
      campaignId,
      metadata: {
        includedSources: {
          brandBrain: includeBrandBrain,
          agentLearning: includeAgentLearning && !!agentId,
          campaignContext: includeCampaignContext && !!campaignId,
        },
      },
    };
  }

  async buildPackFromRequest(request: BuildContextPackRequest): Promise<RagContextPack> {
    return this.buildPack({
      companyId: request.companyId,
      query: request.query,
      agentId: request.agentId,
      campaignId: request.campaignId,
      limit: request.limit,
      includeBrandBrain: request.includeBrandBrain,
      includeAgentLearning: request.includeAgentLearning,
      includeCampaignContext: request.includeCampaignContext,
    });
  }

  async getApprovedRunsForAgent(
    companyId: string,
    agentId: string,
    campaignId?: string,
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      outputPayload: Record<string, unknown>;
      completedAt: Date | null;
    }>
  > {
    const where: Prisma.AgentRunWhereInput = {
      companyId,
      agentId,
      status: 'COMPLETED',
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const runs = await this.prisma.agentRun.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        outputPayload: true,
        completedAt: true,
      },
    });

    return runs.map((run) => ({
      id: run.id,
      outputPayload: run.outputPayload as Record<string, unknown>,
      completedAt: run.completedAt,
    }));
  }

  async getBrandProfile(companyId: string) {
    return this.prisma.brandProfile.findUnique({
      where: { companyId },
    });
  }

  formatContextForPrompt(pack: RagContextPack): string {
    if (pack.chunks.length === 0) {
      return '';
    }

    const sections: string[] = [];

    const brandChunks = pack.chunks.filter((c) => c.sourceType === 'BRAND_BRAIN');
    if (brandChunks.length > 0) {
      sections.push('## Cérebro da Marca\n' + brandChunks.map((c) => c.content).join('\n\n'));
    }

    const learningChunks = pack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
    if (learningChunks.length > 0) {
      sections.push(
        '## Aprendizados Anteriores\n' + learningChunks.map((c) => c.content).join('\n\n'),
      );
    }

    const campaignChunks = pack.chunks.filter(
      (c) => c.sourceType === 'CAMPAIGN' || c.sourceType === 'CAMPAIGN_FILE',
    );
    if (campaignChunks.length > 0) {
      sections.push(
        '## Contexto da Campanha\n' + campaignChunks.map((c) => c.content).join('\n\n'),
      );
    }

    return sections.join('\n\n---\n\n');
  }

  private deduplicateChunks(chunks: RagRetrievedChunk[]): RagRetrievedChunk[] {
    const seen = new Set<string>();
    return chunks.filter((chunk) => {
      if (seen.has(chunk.id)) return false;
      seen.add(chunk.id);
      return true;
    });
  }
}
