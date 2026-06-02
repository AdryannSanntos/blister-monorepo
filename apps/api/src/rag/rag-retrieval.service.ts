import type { RagRetrievedChunk } from '@company-os/types';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagPolicyService } from './rag-policy.service';
import { RagSourceRegistry } from './rag-source-registry.service';

interface RetrievalOptions {
  limit?: number;
  minScore?: number;
  sourceTypes?: string[];
  permissions?: string[];
  /** Per-source-type multipliers applied to similarity before ranking. */
  weights?: Record<string, number>;
}

/**
 * Pure re-ranking of retrieved chunks. Multiplies each chunk's similarity by its
 * source weight, drops anything below `minScore` (on the RAW similarity, so the
 * threshold stays meaningful) and returns the top `limit`. Keeping this pure makes
 * the weighting behavior testable without a database.
 */
export function rankRetrievedChunks(
  chunks: RagRetrievedChunk[],
  options: { weights?: Record<string, number>; minScore?: number; limit: number },
): RagRetrievedChunk[] {
  const { weights = {}, minScore = 0, limit } = options;
  return chunks
    .filter((chunk) => chunk.score >= minScore)
    .map((chunk) => ({ chunk, weighted: chunk.score * (weights[chunk.sourceType] ?? 1) }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}

interface RawEmbeddingRow {
  chunk_id: string;
  document_id: string;
  source_type: string;
  source_id: string | null;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

@Injectable()
export class RagRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: RagEmbeddingService,
    private readonly policyService: RagPolicyService,
    private readonly sourceRegistry: RagSourceRegistry,
  ) {}

  async search(
    organizationId: string,
    query: string,
    options: RetrievalOptions = {},
  ): Promise<RagRetrievedChunk[]> {
    const { limit = 8, minScore = 0, permissions = [] } = options;

    const allowedSourceTypes = this.policyService.getAllowedSourceTypes(permissions);
    const sourceTypeFilter =
      options.sourceTypes?.filter((t) => allowedSourceTypes.includes(t)) ?? allowedSourceTypes;

    if (sourceTypeFilter.length === 0) return [];

    const queryVector = await this.embeddingService.embedQuery(organizationId, query);
    // Format as pgvector literal: [1.0, 2.0, ...] — parameterized binding casts via ::vector
    const vectorString = `[${queryVector.join(',')}]`;

    // Over-fetch candidates so source weighting can re-rank meaningfully before topK.
    const candidateLimit = Math.min(50, Math.max(limit * 3, limit));

    const rows = await this.prisma.$queryRaw<RawEmbeddingRow[]>(Prisma.sql`
      SELECT
        rc.id        AS chunk_id,
        rd.id        AS document_id,
        rd."sourceType" AS source_type,
        rd."sourceId"   AS source_id,
        rd.title        AS title,
        rc.content      AS content,
        rc.metadata     AS metadata,
        1 - (re.vector <=> ${vectorString}::vector) AS score
      FROM "RagEmbedding" re
      JOIN "RagChunk"    rc ON rc.id = re."chunkId"
      JOIN "RagDocument" rd ON rd.id = rc."documentId"
      WHERE re."organizationId" = ${organizationId}
        AND rd.status = 'indexed'
        AND rd."sourceType" = ANY(${sourceTypeFilter}::text[])
      ORDER BY re.vector <=> ${vectorString}::vector
      LIMIT ${candidateLimit}
    `);

    const candidates = rows.map((r) => ({
      id: r.chunk_id,
      documentId: r.document_id,
      sourceType: r.source_type as RagRetrievedChunk['sourceType'],
      sourceId: r.source_id ?? null,
      title: r.title ?? null,
      // Chunks are bounded at ~512 tokens by the chunker, so return enough to
      // carry a full chunk to the LLM. A tight cap here silently dropped the
      // tail of each chunk (e.g. a résumé's work history), yielding incomplete
      // answers even when the right chunk was retrieved.
      snippet: String(r.content ?? '').slice(0, 2400),
      score: Number(r.score),
      metadata: this.policyService.sanitizeMetadata((r.metadata as Record<string, unknown>) ?? {}),
    }));

    return rankRetrievedChunks(candidates, {
      weights: options.weights ?? this.sourceRegistry.defaultWeights(),
      minScore,
      limit,
    });
  }
}
