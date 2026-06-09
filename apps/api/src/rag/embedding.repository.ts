import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../ai-runtime/embedding.service';
import type { RagEmbedding } from '../generated/prisma';

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  companyId: string;
  campaignId: string | null;
  agentId: string | null;
  sourceType: string;
  sourceId: string;
  title: string | null;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

export interface VectorSearchOptions {
  companyId: string;
  query: string;
  limit?: number;
  minScore?: number;
  sourceTypes?: string[];
  campaignId?: string;
  agentId?: string;
  boostAgentId?: string;
  boostCampaignId?: string;
}

const DIMENSIONS = 1536;
const DEFAULT_MIN_SCORE = 0.5;

@Injectable()
export class EmbeddingRepository {
  private readonly logger = new Logger(EmbeddingRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async createEmbedding(chunkId: string, embedding: number[]): Promise<RagEmbedding> {
    await this.prisma.$executeRaw`
      INSERT INTO "RagEmbedding" ("id", "chunkId", "embeddingModel", "dimensions", "embedding", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${chunkId},
        'text-embedding-3-small',
        ${DIMENSIONS},
        ${embedding}::vector,
        NOW()
      )
      ON CONFLICT ("chunkId") DO UPDATE SET
        "embedding" = ${embedding}::vector,
        "embeddingModel" = 'text-embedding-3-small'
    `;

    const result = await this.prisma.ragEmbedding.findUnique({
      where: { chunkId },
    });

    if (!result) {
      throw new Error(`Failed to create embedding for chunk ${chunkId}`);
    }

    return result;
  }

  async createEmbeddingsForChunks(
    chunks: Array<{ id: string; content: string }>,
  ): Promise<number> {
    if (chunks.length === 0) return 0;

    const contents = chunks.map((c) => c.content);
    const response = await this.embeddingService.embed({ texts: contents });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = response.embeddings[i];
      await this.createEmbedding(chunk.id, embedding);
    }

    this.logger.debug(`Created ${chunks.length} embeddings`);
    return chunks.length;
  }

  async searchSimilar(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embedSingle(options.query);
    const limit = options.limit ?? 10;
    const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

    let sourceTypeFilter = '';
    if (options.sourceTypes && options.sourceTypes.length > 0) {
      const types = options.sourceTypes.map((t) => `'${t}'`).join(',');
      sourceTypeFilter = `AND d."sourceType" IN (${types})`;
    }

    let campaignFilter = '';
    if (options.campaignId) {
      campaignFilter = `AND (c."campaignId" = '${options.campaignId}' OR c."campaignId" IS NULL)`;
    }

    let agentFilter = '';
    if (options.agentId) {
      agentFilter = `AND (c."agentId" = '${options.agentId}' OR c."agentId" IS NULL)`;
    }

    const boostAgentClause = options.boostAgentId
      ? `CASE WHEN c."agentId" = '${options.boostAgentId}' THEN 0.1 ELSE 0 END`
      : '0';

    const boostCampaignClause = options.boostCampaignId
      ? `CASE WHEN c."campaignId" = '${options.boostCampaignId}' THEN 0.05 ELSE 0 END`
      : '0';

    const results = await this.prisma.$queryRaw<VectorSearchResult[]>`
      SELECT 
        c.id as "chunkId",
        c."documentId",
        c.content,
        c."companyId",
        c."campaignId",
        c."agentId",
        c."chunkIndex",
        c.metadata,
        d."sourceType",
        d."sourceId",
        d.title,
        (1 - (e.embedding <=> ${queryEmbedding}::vector)) + ${boostAgentClause}::float + ${boostCampaignClause}::float as score
      FROM "RagChunk" c
      JOIN "RagEmbedding" e ON e."chunkId" = c.id
      JOIN "RagDocument" d ON d.id = c."documentId"
      WHERE c."companyId" = ${options.companyId}
        AND d.status = 'INDEXED'
        ${sourceTypeFilter ? this.prisma.$queryRawUnsafe(sourceTypeFilter) : this.prisma.$queryRawUnsafe('')}
        ${campaignFilter ? this.prisma.$queryRawUnsafe(campaignFilter) : this.prisma.$queryRawUnsafe('')}
        ${agentFilter ? this.prisma.$queryRawUnsafe(agentFilter) : this.prisma.$queryRawUnsafe('')}
      ORDER BY score DESC
      LIMIT ${limit}
    `;

    return results.filter((r) => r.score >= minScore);
  }

  async deleteByChunkId(chunkId: string): Promise<boolean> {
    const result = await this.prisma.ragEmbedding.deleteMany({
      where: { chunkId },
    });
    return result.count > 0;
  }

  async deleteByChunkIds(chunkIds: string[]): Promise<number> {
    const result = await this.prisma.ragEmbedding.deleteMany({
      where: { chunkId: { in: chunkIds } },
    });
    return result.count;
  }
}
