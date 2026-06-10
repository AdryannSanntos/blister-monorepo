import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../ai-runtime/embedding.service';
import { Prisma, type RagEmbedding } from '../generated/prisma';

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

  async createEmbedding(
    chunkId: string,
    embedding: number[],
    model = 'text-embedding-3-small',
    dimensions = DIMENSIONS,
  ): Promise<RagEmbedding> {
    if (embedding.length !== dimensions) {
      throw new Error(
        `Embedding dimension mismatch for chunk ${chunkId}: expected ${dimensions}, got ${embedding.length}. ` +
          `The configured embedding model must produce ${dimensions}-dim vectors to match the RagEmbedding column.`,
      );
    }

    const storageModel = model.includes('/')
      ? model.split('/').slice(1).join('/')
      : model;

    await this.prisma.$executeRaw`
      INSERT INTO "RagEmbedding" ("id", "chunkId", "embeddingModel", "dimensions", "embedding", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${chunkId},
        ${storageModel},
        ${dimensions},
        ${embedding}::vector,
        NOW()
      )
      ON CONFLICT ("chunkId") DO UPDATE SET
        "embedding" = ${embedding}::vector,
        "embeddingModel" = ${storageModel},
        "dimensions" = ${dimensions}
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
      await this.createEmbedding(
        chunk.id,
        embedding,
        response.model,
        response.dimensions,
      );
    }

    this.logger.debug(`Created ${chunks.length} embeddings`);
    return chunks.length;
  }

  async searchSimilar(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embedSingle(options.query);
    const limit = options.limit ?? 10;
    const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

    // All dynamic filters use parameterized Prisma.sql fragments — never string
    // interpolation — so user-supplied values (campaignId, agentId, sourceTypes)
    // cannot break out of the query (SQL injection) or bypass tenant scoping.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`c."companyId" = ${options.companyId}`,
      Prisma.sql`d.status = 'INDEXED'`,
    ];

    if (options.sourceTypes && options.sourceTypes.length > 0) {
      conditions.push(
        Prisma.sql`d."sourceType"::text IN (${Prisma.join(options.sourceTypes)})`,
      );
    }

    if (options.campaignId) {
      conditions.push(
        Prisma.sql`(c."campaignId" = ${options.campaignId} OR c."campaignId" IS NULL)`,
      );
    }

    if (options.agentId) {
      conditions.push(
        Prisma.sql`(c."agentId" = ${options.agentId} OR c."agentId" IS NULL)`,
      );
    }

    const boostAgentClause = options.boostAgentId
      ? Prisma.sql`CASE WHEN c."agentId" = ${options.boostAgentId} THEN 0.1 ELSE 0 END`
      : Prisma.sql`0`;

    const boostCampaignClause = options.boostCampaignId
      ? Prisma.sql`CASE WHEN c."campaignId" = ${options.boostCampaignId} THEN 0.05 ELSE 0 END`
      : Prisma.sql`0`;

    const results = await this.prisma.$queryRaw<VectorSearchResult[]>(Prisma.sql`
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
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY score DESC
      LIMIT ${limit}
    `);

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
