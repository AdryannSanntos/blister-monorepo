import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiProviderAdapter,
  AiRuntimeCapability,
  AiRuntimeEmbeddingRequest,
  AiRuntimeEmbeddingResult,
  AiRuntimeImageRequest,
  AiRuntimeImageResult,
  AiRuntimeStreamChunk,
  AiRuntimeTextRequest,
  AiRuntimeTextResult,
} from './ai-provider.adapter';
import {
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message?: { content: string };
    delta?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

interface OpenRouterEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage?: { total_tokens?: number };
}

@Injectable()
export class OpenRouterAdapter implements AiProviderAdapter {
  readonly provider = 'openrouter';
  private readonly logger = new Logger(OpenRouterAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
  }

  supports(capability: AiRuntimeCapability): boolean {
    return ['text_generation', 'embeddings', 'structured_output'].includes(
      capability,
    );
  }

  async generateText(request: AiRuntimeTextRequest): Promise<AiRuntimeTextResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    };

    if (request.structuredOutputSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          schema: request.structuredOutputSchema,
        },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`OpenRouter completion failed: ${error}`);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      const data = (await response.json()) as OpenRouterResponse;

      const content = data.choices[0]?.message?.content ?? '';
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;

      let structuredOutput: Record<string, unknown> | undefined;
      if (request.structuredOutputSchema) {
        try {
          structuredOutput = JSON.parse(content) as Record<string, unknown>;
        } catch {
          this.logger.warn('Failed to parse structured output as JSON');
        }
      }

      return {
        content,
        structuredOutput,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: data.choices[0]?.finish_reason ?? 'stop',
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('OpenRouter completion failed', error);
      throw new ProviderExecutionError(
        this.provider,
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async *streamText(
    request: AiRuntimeTextRequest,
  ): AsyncGenerator<AiRuntimeStreamChunk, AiRuntimeTextResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let finishReason = 'stop';

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as OpenRouterResponse;
            const content = parsed.choices[0]?.delta?.content ?? '';

            if (content) {
              fullContent += content;
              yield { content, isLast: false };
            }

            if (parsed.choices[0]?.finish_reason) {
              finishReason = parsed.choices[0].finish_reason;
            }

            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens ?? 0;
              completionTokens = parsed.usage.completion_tokens ?? 0;
            }
          } catch {
            continue;
          }
        }
      }

      yield { content: '', isLast: true };

      return {
        content: fullContent,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason,
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('OpenRouter stream failed', error);
      throw new ProviderExecutionError(
        this.provider,
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async createEmbedding(
    request: AiRuntimeEmbeddingRequest,
  ): Promise<AiRuntimeEmbeddingResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    const inputs = Array.isArray(request.input) ? request.input : [request.input];

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          input: inputs,
          dimensions: request.dimensions,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`OpenRouter embedding failed: ${error}`);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      const data = (await response.json()) as OpenRouterEmbeddingResponse;

      const embeddings = data.data.map((item) => item.embedding);
      const totalTokens = data.usage?.total_tokens ?? 0;
      const dimensions = embeddings[0]?.length ?? request.dimensions ?? 1536;

      return {
        embeddings,
        usage: {
          promptTokens: totalTokens,
          completionTokens: 0,
          totalTokens,
        },
        dimensions,
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('OpenRouter embedding failed', error);
      throw new ProviderExecutionError(
        this.provider,
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async generateImage(
    _request: AiRuntimeImageRequest,
  ): Promise<AiRuntimeImageResult> {
    throw new ProviderExecutionError(
      this.provider,
      'validation',
      'OpenRouter does not support direct image generation',
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.config.get('APP_URL', 'https://blister.app'),
      'X-Title': 'Blister',
    };
  }

  private mapErrorCategory(
    status: number,
  ): 'auth' | 'rate_limit' | 'validation' | 'unknown' {
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'rate_limit';
    if (status >= 400 && status < 500) return 'validation';
    return 'unknown';
  }
}
