import { ProviderExecutionError, parseProviderError } from '../../../errors';
import type { IEmbeddingProvider } from '../embedding-provider';
import { RAG_EMBEDDING_DIMENSIONS } from './openrouter-embedding.adapter';

export interface GeminiEmbeddingAdapterOptions {
  apiKey: string;
  /** External embedding model id, e.g. `text-embedding-004`. */
  model: string;
  baseUrl?: string;
  dimensions?: number;
}

interface GeminiEmbedResponse {
  embedding?: { values?: number[] };
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Google Gemini embeddings adapter implementing the embedding capability. */
export class GeminiEmbeddingAdapter implements IEmbeddingProvider {
  readonly provider = 'gemini';
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GeminiEmbeddingAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.dimensions = options.dimensions ?? RAG_EMBEDDING_DIMENSIONS;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      try {
        const url = new URL(`${this.baseUrl}/models/${this.model}:embedContent`);
        url.searchParams.set('key', this.apiKey);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: this.dimensions,
          }),
        });

        if (!response.ok) {
          throw parseProviderError(
            this.provider,
            response.status,
            await response.text(),
          );
        }

        const data = (await response.json()) as GeminiEmbedResponse;
        embeddings.push(data.embedding?.values ?? []);
      } catch (error) {
        if (error instanceof ProviderExecutionError) throw error;
        throw new ProviderExecutionError(
          this.provider,
          'unknown',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return embeddings;
  }
}
