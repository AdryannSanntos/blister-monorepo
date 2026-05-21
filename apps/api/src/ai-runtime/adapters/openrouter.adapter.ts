import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  type AIProviderAdapter,
  type AIRuntimeCapability,
  type AIRuntimeEmbeddingRequest,
  type AIRuntimeEmbeddingResult,
  type AIRuntimeImageRequest,
  type AIRuntimeImageResult,
  type AIRuntimeTextRequest,
  type AIRuntimeTextResult,
  ProviderExecutionError,
} from './ai-provider.adapter';

@Injectable()
export class OpenRouterAdapter implements AIProviderAdapter {
  readonly provider = 'openrouter';

  private readonly supportedCapabilities = new Set<AIRuntimeCapability>([
    'text_generation',
    'image_generation',
    'embeddings',
    'structured_output',
  ]);

  supports(capability: AIRuntimeCapability) {
    return this.supportedCapabilities.has(capability);
  }

  async generateText(request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: request.model.apiModelName,
          messages:
            request.messages ?? [{ role: 'user', content: request.prompt ?? '' }],
          temperature: request.temperature,
          max_tokens: request.maxOutputTokens,
          response_format: request.structuredOutputSchema
            ? {
                type: 'json_schema',
                json_schema: {
                  name: 'structured_output',
                  schema: request.structuredOutputSchema,
                },
              }
            : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${request.credential.value}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const choice = response.data?.choices?.[0];
      const content = choice?.message?.content;
      const text = typeof content === 'string' ? content : JSON.stringify(content ?? {});

      return {
        text,
        usage: {
          promptTokens: response.data?.usage?.prompt_tokens,
          completionTokens: response.data?.usage?.completion_tokens,
          totalTokens: response.data?.usage?.total_tokens,
          raw: response.data?.usage,
        },
        raw: response.data,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async generateImage(request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/images/generations',
        {
          model: request.model.apiModelName,
          prompt: request.prompt,
          size: request.size,
        },
        {
          headers: {
            Authorization: `Bearer ${request.credential.value}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        images: (response.data?.data ?? []).map((image: { url?: string }) => ({
          url: image.url ?? '',
        })),
        usage: {
          imageCount: Array.isArray(response.data?.data) ? response.data.data.length : 0,
          raw: response.data?.usage,
        },
        raw: response.data,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createEmbedding(request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model: request.model.apiModelName,
          input: request.input,
        },
        {
          headers: {
            Authorization: `Bearer ${request.credential.value}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        embedding: response.data?.data?.[0]?.embedding ?? [],
        usage: {
          totalTokens: response.data?.usage?.total_tokens,
          embeddingCount: Array.isArray(response.data?.data) ? response.data.data.length : 0,
          raw: response.data?.usage,
        },
        raw: response.data,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown) {
    const statusCode =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (statusCode === 401 || statusCode === 403) {
      return new ProviderExecutionError(this.provider, 'auth', 'Provider authentication failed', statusCode);
    }

    if (statusCode === 422) {
      return new ProviderExecutionError(this.provider, 'validation', 'Provider rejected the request', statusCode);
    }

    if (statusCode === 429) {
      return new ProviderExecutionError(this.provider, 'rate_limit', 'Provider rate limit exceeded', statusCode);
    }

    const message = error instanceof Error ? error.message : 'Provider request failed';
    return new ProviderExecutionError(this.provider, 'unknown', message, statusCode);
  }
}
