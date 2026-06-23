import { ProviderExecutionError, parseProviderError } from '../../../errors';
import type { IEmbeddingProvider } from '../embedding-provider';

/** Dimensionality of the `RagEmbedding.embedding` pgvector column. */
export const RAG_EMBEDDING_DIMENSIONS = 1536;

export interface OpenRouterEmbeddingAdapterOptions {
  apiKey: string;
  /** External embedding model id, e.g. `openai/text-embedding-3-small`. */
  model: string;
  baseUrl?: string;
  dimensions?: number;
}

interface OpenRouterEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage?: { total_tokens?: number };
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/** OpenRouter embeddings adapter implementing the embedding capability. */
export class OpenRouterEmbeddingAdapter implements IEmbeddingProvider {
  readonly provider = 'openrouter';
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: OpenRouterEmbeddingAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.dimensions = options.dimensions ?? RAG_EMBEDDING_DIMENSIONS;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
        }),
      });

      if (!response.ok) {
        throw parseProviderError(
          this.provider,
          response.status,
          await response.text(),
        );
      }

      const data = (await response.json()) as OpenRouterEmbeddingResponse;
      return data.data.map((item) => item.embedding);
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      throw new ProviderExecutionError(
        this.provider,
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
