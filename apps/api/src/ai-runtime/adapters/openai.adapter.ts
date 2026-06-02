import { Injectable } from '@nestjs/common';
import {
  type AIProviderAdapter,
  type AIProviderListedModel,
  type AIRuntimeCapability,
  type AIRuntimeEmbeddingRequest,
  type AIRuntimeEmbeddingResult,
  type AIRuntimeImageRequest,
  type AIRuntimeImageResult,
  type AIRuntimeResolvedCredential,
  type AIRuntimeTextRequest,
  type AIRuntimeTextResult,
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

@Injectable()
export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = 'openai';

  supports(_capability: AIRuntimeCapability) {
    return false;
  }

  async listModels(credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    const response = await fetch(`${this.resolveBaseUrl()}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${credential.value}`,
        'Content-Type': 'application/json',
      },
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
      data?: Array<{ id?: string; created?: number; owned_by?: string }>;
    };

    return (payload.data ?? [])
      .filter(
        (model): model is { id: string; created?: number; owned_by?: string } =>
          typeof model.id === 'string',
      )
      .map((model) => ({
        slug: this.slugify(model.id),
        name: model.id,
        externalModelId: model.id,
        description: `Synced from OpenAI (${model.owned_by ?? 'openai'}).`,
        status: 'active' as const,
        capabilityMetadata: this.inferCapabilities(model.id),
        pricingMetadata: {},
        limitsMetadata: typeof model.created === 'number' ? { created: model.created } : {},
        schemaMetadata: {
          providerManaged: true,
          raw: model,
        },
      }));
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
    return (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
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
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private inferCapabilities(modelId: string) {
    const normalized = modelId.toLowerCase();

    return {
      text:
        !normalized.includes('embedding') &&
        !normalized.includes('tts') &&
        !normalized.includes('transcribe'),
      image: normalized.includes('gpt-image') || normalized.includes('dall-e'),
      embeddings: normalized.includes('embedding'),
      audio:
        normalized.includes('tts') ||
        normalized.includes('transcribe') ||
        normalized.includes('whisper'),
      structuredOutput:
        normalized.includes('gpt-4') ||
        normalized.includes('gpt-5') ||
        normalized.includes('o1') ||
        normalized.includes('o3'),
    };
  }
}
