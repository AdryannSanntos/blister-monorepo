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
export class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = 'anthropic';

  supports(_capability: AIRuntimeCapability) {
    return false;
  }

  async listModels(credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    const response = await fetch(`${this.resolveBaseUrl()}/models`, {
      method: 'GET',
      headers: {
        'x-api-key': credential.value,
        'anthropic-version': process.env.ANTHROPIC_API_VERSION ?? '2023-06-01',
        'content-type': 'application/json',
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
      data?: Array<{
        id?: string;
        display_name?: string;
        created_at?: string;
        max_input_tokens?: number;
        max_tokens?: number;
        capabilities?: Record<string, { supported?: boolean }>;
      }>;
    };

    return (payload.data ?? [])
      .filter((model): model is NonNullable<typeof payload.data>[number] & { id: string } => typeof model.id === 'string')
      .map((model) => ({
        slug: this.slugify(model.id),
        name: model.display_name ?? model.id,
        externalModelId: model.id,
        description: 'Synced from Anthropic.',
        status: 'active' as const,
        capabilityMetadata: {
          text: true,
          vision: model.capabilities?.image_input?.supported === true,
          structuredOutput: model.capabilities?.structured_outputs?.supported === true,
          reasoning: model.capabilities?.thinking?.supported === true,
        },
        pricingMetadata: {},
        limitsMetadata: {
          maxInputTokens: model.max_input_tokens ?? null,
          maxOutputTokens: model.max_tokens ?? null,
          createdAt: model.created_at ?? null,
        },
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
    return (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
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
