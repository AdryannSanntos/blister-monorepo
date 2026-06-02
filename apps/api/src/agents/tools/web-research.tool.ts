import { Injectable, Logger } from '@nestjs/common';
import type { AgentToolResult } from '../dto/agent-chat-tool.dto';

/** DI token for the external web-research provider. */
export const WEB_RESEARCH_GATEWAY = 'WEB_RESEARCH_GATEWAY';

export type WebResearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  retrievedAt: string;
};

export interface WebResearchGateway {
  searchAndFetch(input: {
    query: string;
    limit: number;
    organizationId?: string;
  }): Promise<WebResearchResult[]>;
}

/** Minimal cache contract the tool depends on (implemented by WebResearchCacheService). */
export interface WebResearchCache {
  getCached(
    organizationId: string,
    query: string,
    options?: { ttlMs?: number; limit?: number },
  ): Promise<WebResearchResult[]>;
  store(organizationId: string, query: string, results: WebResearchResult[]): Promise<void>;
}

/**
 * Explicit adapter boundary. Bind a real provider to `WEB_RESEARCH_GATEWAY`; this
 * stub returns no evidence so the tool degrades cleanly when no provider is wired.
 */
@Injectable()
export class StubWebResearchGateway implements WebResearchGateway {
  private readonly logger = new Logger(StubWebResearchGateway.name);

  async searchAndFetch(): Promise<WebResearchResult[]> {
    this.logger.debug('web_research gateway not configured — returning no external sources');
    return [];
  }
}

function buildResult(
  results: WebResearchResult[],
  limit: number,
  reused: boolean,
): AgentToolResult {
  const trimmed = results.slice(0, limit);
  return {
    toolName: 'web_research',
    summary:
      trimmed.length > 0
        ? `${reused ? 'Reaproveitadas' : 'Pesquisadas'} ${trimmed.length} fontes externas.`
        : 'Nenhuma fonte externa relevante encontrada.',
    results: trimmed.map((row) => ({
      title: row.title,
      url: row.url,
      snippet: row.snippet,
      source: row.source,
      retrievedAt: row.retrievedAt,
    })),
    citations: trimmed.map((row) => ({ label: row.title || row.url, url: row.url })),
    metadata: {
      durationMs: 0,
      resultCount: trimmed.length,
      truncated: results.length > trimmed.length,
    },
  };
}

/**
 * Runs web research with cache-first reuse: an identical recent query is served
 * from the cache (no external call); otherwise the gateway is queried and the
 * normalized results are persisted + indexed for future reuse.
 */
export async function runWebResearchTool(params: {
  gateway: WebResearchGateway;
  cache?: WebResearchCache;
  organizationId: string;
  query: string;
  limit: number;
}): Promise<AgentToolResult> {
  const startedAt = Date.now();
  const { gateway, cache, organizationId, query, limit } = params;

  if (cache) {
    const cached = await cache.getCached(organizationId, query, { limit }).catch(() => []);
    if (cached.length > 0) {
      const result = buildResult(cached, limit, true);
      result.metadata.durationMs = Date.now() - startedAt;
      return result;
    }
  }

  const fetched = await gateway.searchAndFetch({ query, limit, organizationId });

  if (cache && fetched.length > 0) {
    await cache.store(organizationId, query, fetched).catch(() => undefined);
  }

  const result = buildResult(fetched, limit, false);
  result.metadata.durationMs = Date.now() - startedAt;
  return result;
}
