import { Injectable } from '@nestjs/common';

type ContextSourceItem = {
  sourceLabel: string;
  snippet: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ContextRerankerService {
  rerank(input: {
    query: string;
    structured: ContextSourceItem[];
    rag: ContextSourceItem[];
    limit?: number;
  }) {
    const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);

    const combined = [...input.structured, ...input.rag].map((item) => {
      const haystack = `${item.sourceLabel} ${item.snippet}`.toLowerCase();
      const keywordScore = terms.reduce(
        (score, term) => score + (haystack.includes(term) ? 1 : 0),
        0,
      );

      return {
        sourceLabel: item.sourceLabel,
        snippet: item.snippet,
        metadata: item.metadata ?? {},
        score: (item.score ?? 0) + keywordScore,
      };
    });

    return combined.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 12);
  }
}
