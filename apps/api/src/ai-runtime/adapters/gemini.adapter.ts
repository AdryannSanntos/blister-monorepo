import { Injectable } from '@nestjs/common';
import {
  type AIProviderListedModel,
  type AIProviderAdapter,
  type AIRuntimeCapability,
  type AIRuntimeResolvedCredential,
  type AIRuntimeEmbeddingRequest,
  type AIRuntimeEmbeddingResult,
  type AIRuntimeImageRequest,
  type AIRuntimeImageResult,
  type AIRuntimeTextRequest,
  type AIRuntimeTextResult,
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

@Injectable()
export class GeminiAdapter implements AIProviderAdapter {
  readonly provider = 'gemini';

  supports(_capability: AIRuntimeCapability) {
    return false;
  }

  async listModels(credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    const models: Array<{
      name?: string;
      displayName?: string;
      description?: string;
      inputTokenLimit?: number;
      outputTokenLimit?: number;
      supportedGenerationMethods?: string[];
    }> = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${this.resolveBaseUrl()}/models`);
      url.searchParams.set('key', credential.value);
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new ProviderExecutionError(
          this.provider,
          response.status === 401 || response.status === 403 ? 'auth' : 'unknown',
          await this.readErrorMessage(response),
          response.status,
        );
      }

      const payload = (await response.json()) as {
        models?: typeof models;
        nextPageToken?: string;
      };

      models.push(...(payload.models ?? []));
      pageToken = payload.nextPageToken;
    } while (pageToken);

    return models
      .filter((model): model is (typeof models)[number] & { name: string } => typeof model.name === 'string')
      .map((model) => {
        const methods = Array.isArray(model.supportedGenerationMethods)
          ? model.supportedGenerationMethods
          : [];
        const normalizedName = model.name.replace(/^models\//, '');

        return {
          slug: this.slugify(normalizedName),
          name: model.displayName ?? normalizedName,
          externalModelId: normalizedName,
          description: model.description,
          status: 'active' as const,
          capabilityMetadata: {
            text: methods.includes('generateContent'),
            embeddings: methods.includes('embedContent') || methods.includes('batchEmbedContents'),
            image: normalizedName.toLowerCase().includes('imagen'),
            vision: methods.includes('generateContent'),
          },
          pricingMetadata: {},
          limitsMetadata: {
            maxInputTokens: model.inputTokenLimit ?? null,
            maxOutputTokens: model.outputTokenLimit ?? null,
          },
          schemaMetadata: {
            providerManaged: true,
            raw: model,
          },
        };
      });
  }

  async generateText(_request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  async generateImage(_request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  async createEmbedding(_request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  private resolveBaseUrl() {
    return (process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  }

  private async readErrorMessage(response: Response) {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message ?? `Provider request failed with status ${response.status}`;
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
  }

  private slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
