import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagIndexingService } from './rag-indexing.service';

export interface WebResearchCachedResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  retrievedAt: string;
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

/** Pure: normalizes a query so semantically-equal queries share one cache key. */
export function normalizeWebQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Pure: deterministic cache key for a query. */
export function webQueryKey(query: string): string {
  return `web:${createHash('sha256').update(normalizeWebQuery(query)).digest('hex').slice(0, 32)}`;
}

/**
 * Persists and reuses normalized external research. Results are stored as
 * `web_research` RAG documents (so they are also indexed and retrievable by the
 * shared platform) and reused for an identical query within the TTL — avoiding a
 * second external call. A failing/stale cache never blocks fresh research.
 */
@Injectable()
export class WebResearchCacheService {
  private readonly logger = new Logger(WebResearchCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexingService: RagIndexingService,
  ) {}

  /** Returns cached results for an identical recent query, or [] when none/stale. */
  async getCached(
    organizationId: string,
    query: string,
    options: { ttlMs?: number; limit?: number } = {},
  ): Promise<WebResearchCachedResult[]> {
    const key = webQueryKey(query);
    const since = new Date(Date.now() - (options.ttlMs ?? DEFAULT_TTL_MS));

    try {
      const docs = await this.prisma.ragDocument.findMany({
        where: {
          organizationId,
          sourceType: 'web_research',
          createdAt: { gte: since },
          metadata: { path: ['queryKey'], equals: key },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 8,
      });
      return docs
        .map((doc) => this.toResult(doc.metadata))
        .filter((r): r is WebResearchCachedResult => r !== null);
    } catch (error) {
      this.logger.warn(
        `web research cache lookup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  /** Stores + indexes fresh results so they become reusable and retrievable. */
  async store(
    organizationId: string,
    query: string,
    results: WebResearchCachedResult[],
  ): Promise<void> {
    const key = webQueryKey(query);
    for (const result of results) {
      if (!result.url || !result.snippet) continue;
      try {
        await this.indexingService.ingest(organizationId, {
          sourceType: 'web_research',
          sourceId: `${key}:${createHash('sha256').update(result.url).digest('hex').slice(0, 16)}`,
          title: result.title || result.url,
          content: `${result.title}\n${result.snippet}`,
          metadata: {
            queryKey: key,
            url: result.url,
            title: result.title,
            snippet: result.snippet,
            source: result.source,
            retrievedAt: result.retrievedAt,
          },
          forceReindex: false,
        });
      } catch (error) {
        this.logger.warn(
          `failed to cache web research result: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  private toResult(metadata: unknown): WebResearchCachedResult | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const m = metadata as Record<string, unknown>;
    if (typeof m.url !== 'string') return null;
    return {
      title: typeof m.title === 'string' ? m.title : m.url,
      url: m.url,
      snippet: typeof m.snippet === 'string' ? m.snippet : '',
      source: typeof m.source === 'string' ? m.source : m.url,
      retrievedAt: typeof m.retrievedAt === 'string' ? m.retrievedAt : '',
    };
  }
}
