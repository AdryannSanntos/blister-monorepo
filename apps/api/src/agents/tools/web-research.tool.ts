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
  searchAndFetch(input: { query: string; limit: number }): Promise<WebResearchResult[]>;
}

/**
 * Explicit adapter boundary for phase 1. No external search provider is wired in
 * this environment, so this stub returns no evidence. Bind a real provider to
 * `WEB_RESEARCH_GATEWAY` to enable web research without touching runtime semantics.
 */
@Injectable()
export class StubWebResearchGateway implements WebResearchGateway {
  private readonly logger = new Logger(StubWebResearchGateway.name);

  async searchAndFetch(_input: { query: string; limit: number }): Promise<WebResearchResult[]> {
    this.logger.debug('web_research gateway not configured — returning no external sources');
    return [];
  }
}

export async function runWebResearchTool(
  gateway: WebResearchGateway,
  input: { query: string; limit: number },
): Promise<AgentToolResult> {
  const startedAt = Date.now();
  const fetched = await gateway.searchAndFetch({ query: input.query, limit: input.limit });
  const results = fetched.slice(0, input.limit);

  return {
    toolName: 'web_research',
    summary:
      results.length > 0
        ? `Pesquisadas ${results.length} fontes externas.`
        : 'Nenhuma fonte externa relevante encontrada.',
    results: results.map((row) => ({
      title: row.title,
      url: row.url,
      snippet: row.snippet,
      source: row.source,
      retrievedAt: row.retrievedAt,
    })),
    citations: results.map((row) => ({ label: row.title, url: row.url })),
    metadata: {
      durationMs: Date.now() - startedAt,
      resultCount: results.length,
      truncated: fetched.length > results.length,
    },
  };
}
