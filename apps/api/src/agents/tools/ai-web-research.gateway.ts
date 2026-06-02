import { Injectable, Logger } from '@nestjs/common';
import { AIRuntimeService } from '../../ai-runtime/ai-runtime.service';
import type { WebResearchGateway, WebResearchResult } from './web-research.tool';

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          snippet: { type: 'string' },
        },
        required: ['title', 'url', 'snippet'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;

/**
 * Web-research gateway backed by the organization's already-configured AI provider
 * (no new external search vendor). It asks the model to surface real, known web
 * sources for the query. Effective live browsing depends on the configured model's
 * native web-search/grounding capability; the model is instructed to omit a source
 * rather than invent a URL, and anything it returns is parsed defensively.
 */
@Injectable()
export class AiRuntimeWebResearchGateway implements WebResearchGateway {
  private readonly logger = new Logger(AiRuntimeWebResearchGateway.name);

  constructor(private readonly aiRuntime: AIRuntimeService) {}

  async searchAndFetch(input: {
    query: string;
    limit: number;
    organizationId?: string;
  }): Promise<WebResearchResult[]> {
    if (!input.organizationId) return [];

    const system = [
      'Você é um pesquisador da web do Workana AI.',
      `Para a consulta do usuário, retorne até ${input.limit} fontes reais e confiáveis da web.`,
      'NUNCA invente URLs. Se não tiver certeza de que uma fonte e sua URL são reais, não a inclua.',
      'Cada resultado deve ter title, url e um snippet objetivo do conteúdo relevante.',
      'Responda APENAS com o JSON do schema (results: [{title, url, snippet}]).',
    ].join('\n');

    try {
      const result = await this.aiRuntime.generateText({
        organizationId: input.organizationId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: input.query },
        ],
        temperature: 0.2,
        maxOutputTokens: 1500,
        structuredOutputSchema: RESEARCH_SCHEMA as unknown as Record<string, unknown>,
      });

      return this.parseResults(result.structuredOutput ?? result.text, input.limit);
    } catch (error) {
      this.logger.warn(
        `AI web research failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  private parseResults(payload: unknown, limit: number): WebResearchResult[] {
    const parsed = typeof payload === 'string' ? this.tryParse(payload) : payload;
    const rows =
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { results?: unknown }).results)
        ? ((parsed as { results: unknown[] }).results as unknown[])
        : [];

    const retrievedAt = new Date().toISOString();
    const results: WebResearchResult[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      if (!this.isValidHttpUrl(url)) continue; // drop hallucinated / malformed URLs
      results.push({
        title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : url,
        url,
        snippet: typeof r.snippet === 'string' ? r.snippet.trim() : '',
        source: this.hostOf(url),
        retrievedAt,
      });
      if (results.length >= limit) break;
    }
    return results;
  }

  private tryParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private hostOf(value: string): string {
    try {
      return new URL(value).host;
    } catch {
      return 'web';
    }
  }
}
