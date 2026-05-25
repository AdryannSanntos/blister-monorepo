import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { RagRetrievedChunk } from '@company-os/types';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagPolicyService } from './rag-policy.service';

interface RetrievalOptions {
  limit?: number;
  minScore?: number;
  sourceTypes?: string[];
  permissions?: string[];
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
      LIMIT ${limit}
    `);

    return rows
      .filter((r) => r.score >= minScore)
      .map((r) => ({
        id: r.chunk_id,
        documentId: r.document_id,
        sourceType: r.source_type as RagRetrievedChunk['sourceType'],
        sourceId: r.source_id ?? null,
        title: r.title ?? null,
        snippet: String(r.content ?? '').slice(0, 800),
        score: Number(r.score),
        metadata: this.policyService.sanitizeMetadata(
          (r.metadata as Record<string, unknown>) ?? {},
        ),
      }));
  }
}
