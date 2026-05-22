import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextPolicyService } from './context-policy.service';

export type RetrievedContextDocument = {
  id: string;
  sourceLabel: string;
  snippet: string;
  metadata: Record<string, unknown>;
  score: number;
};

@Injectable()
export class RagContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextPolicyService: ContextPolicyService,
  ) {}

  async search(input: {
    organizationId: string;
    queryEmbedding?: number[];
    limit?: number;
  }): Promise<RetrievedContextDocument[]> {
    if (!input.queryEmbedding?.length) {
      return [];
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, content, metadata
      FROM "ContextEmbedding"
      WHERE "organizationId" = ${input.organizationId}
      ORDER BY embedding <=> ${JSON.stringify(input.queryEmbedding)}::vector
      LIMIT ${input.limit ?? 8}
    `);

    return rows.map((row) => {
      const metadata = this.contextPolicyService.sanitizeContext(
        (row.metadata as Record<string, unknown> | null) ?? {},
      );

      return {
        id: String(row.id),
        sourceLabel: String((metadata as Record<string, unknown>).sourceLabel ?? 'Context'),
        snippet: String(row.content ?? '').slice(0, 600),
        metadata: metadata as Record<string, unknown>,
        score: 0,
      };
    });
  }
}
