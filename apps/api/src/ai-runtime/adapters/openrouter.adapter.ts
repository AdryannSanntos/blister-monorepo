import { Injectable } from '@nestjs/common';
import type { OpenRouterOptions } from '@openrouter/agent';
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
  type AIRuntimeTextStreamChunk,
  ProviderExecutionError,
} from './ai-provider.adapter';

type OpenRouterSdkModule = typeof import('@openrouter/sdk');
type OpenRouterEmbeddingPayload = {
  data?: Array<{ embedding?: number[] }>;
  usage?: { totalTokens?: number };
};

const importEsmModule = new Function('specifier', 'return import(specifier)') as <T>(
  specifier: string,
) => Promise<T>;

const trimmedIsDone = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.startsWith('data:') && trimmed.slice('data:'.length).trim() === '[DONE]';
};

let openRouterSdkModulePromise: Promise<OpenRouterSdkModule> | null = null;

const loadOpenRouterSdkModule = () => {
  openRouterSdkModulePromise ??= importEsmModule<OpenRouterSdkModule>('@openrouter/sdk');
  return openRouterSdkModulePromise;
};

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

  async listModels(credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    try {
      const response = await fetch(`${this.resolveBaseUrl()}/models`, {
        method: 'GET',
        headers: this.buildRequestHeaders(credential.value),
      });

      if (!response.ok) {
        const message = await this.readErrorMessage(response);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          message,
          response.status,
        );
      }

      const payload = (await response.json()) as {
        data?: Array<{
          id?: string;
          canonical_slug?: string;
          name?: string;
          description?: string;
          context_length?: number | null;
          supported_parameters?: string[];
          architecture?: {
            input_modalities?: string[];
            output_modalities?: string[];
          };
          pricing?: Record<string, unknown>;
          top_provider?: {
            context_length?: number | null;
            max_completion_tokens?: number | null;
          };
        }>;
      };

      return (payload.data ?? [])
        .filter(
          (model): model is NonNullable<typeof payload.data>[number] & { id: string } =>
            typeof model.id === 'string',
        )
        .map((model) => {
          const outputModalities = model.architecture?.output_modalities ?? [];
          const inputModalities = model.architecture?.input_modalities ?? [];
          return {
            slug: this.slugify(model.canonical_slug ?? model.id),
            name: model.name ?? model.id,
            externalModelId: model.id,
            description: model.description,
            status: 'active' as const,
            capabilityMetadata: {
              text: outputModalities.includes('text'),
              image: outputModalities.includes('image'),
              audio: outputModalities.includes('audio') || outputModalities.includes('speech'),
              embeddings: outputModalities.includes('embeddings'),
              vision: inputModalities.includes('image') || inputModalities.includes('video'),
              structuredOutput: (model.supported_parameters ?? []).includes('structured_outputs'),
            },
            pricingMetadata: model.pricing ?? {},
            limitsMetadata: {
              contextLength: model.top_provider?.context_length ?? model.context_length ?? null,
              maxCompletionTokens: model.top_provider?.max_completion_tokens ?? null,
            },
            schemaMetadata: {
              providerManaged: true,
              raw: model,
            },
          };
        });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async generateText(request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    try {
      const messages: Array<{ role: string; content: string }> = request.messages?.length
        ? request.messages.map((message) => ({ role: message.role, content: message.content }))
        : [{ role: 'user', content: request.prompt ?? '' }];

      const body: Record<string, unknown> = {
        model: request.model.apiModelName,
        messages,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxOutputTokens !== undefined ? { max_tokens: request.maxOutputTokens } : {}),
      };

      if (request.structuredOutputSchema) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'structured_output',
            schema: request.structuredOutputSchema,
            strict: true,
          },
        };
      }

      const response = await this.postJson<{
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      }>('/chat/completions', body, request.credential.value);

      const text = response.choices?.[0]?.message?.content ?? '';

      return {
        text,
        structuredOutput: request.structuredOutputSchema
          ? this.tryParseStructuredOutput(text)
          : undefined,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
          raw: this.toRecord(response.usage),
        },
        raw: this.toRecord(response),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Real token streaming over the OpenAI-compatible `/chat/completions` SSE. Each
   * `data:` line carries a `choices[0].delta.content` chunk; `[DONE]` ends it.
   */
  async *streamText(request: AIRuntimeTextRequest): AsyncIterable<AIRuntimeTextStreamChunk> {
    const messages: Array<{ role: string; content: string }> = request.messages?.length
      ? request.messages.map((message) => ({ role: message.role, content: message.content }))
      : [{ role: 'user', content: request.prompt ?? '' }];

    const body: Record<string, unknown> = {
      model: request.model.apiModelName,
      messages,
      stream: true,
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      ...(request.maxOutputTokens !== undefined ? { max_tokens: request.maxOutputTokens } : {}),
    };

    const timeoutMs = this.resolveTimeoutMs();
    let response: Response;
    try {
      response = await fetch(`${this.resolveBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: this.buildRequestHeaders(request.credential.value),
        body: JSON.stringify(body),
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch (error) {
      throw this.normalizeError(error);
    }

    if (!response.ok || !response.body) {
      const message = await this.readErrorMessage(response);
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        message,
        response.status,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const drainLine = (line: string): AIRuntimeTextStreamChunk | null => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return null;
      const payload = trimmed.slice('data:'.length);
      if (payload.trim() === '[DONE]') return null;
      const delta = OpenRouterAdapter.extractStreamDelta(payload);
      return delta ? { delta } : null;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        // biome-ignore lint/suspicious/noAssignInExpressions: stream line splitting
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (trimmedIsDone(line)) return;
          const chunk = drainLine(line);
          if (chunk) yield chunk;
        }
      }
      const tail = drainLine(buffer);
      if (tail) yield tail;
    } finally {
      reader.releaseLock();
    }
  }

  /** Pure extraction of the streamed delta from one SSE `data:` payload. */
  static extractStreamDelta(dataPayload: string): string | null {
    const trimmed = dataPayload.trim();
    if (!trimmed || trimmed === '[DONE]') return null;
    try {
      const parsed = JSON.parse(trimmed) as {
        choices?: Array<{ delta?: { content?: string | null } }>;
      };
      const content = parsed.choices?.[0]?.delta?.content;
      return typeof content === 'string' && content.length > 0 ? content : null;
    } catch {
      return null;
    }
  }

  async generateImage(request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    try {
      const response = await this.postJson<{
        data?: Array<{ url?: string }>;
        usage?: Record<string, unknown>;
      }>(
        '/images/generations',
        {
          model: request.model.apiModelName,
          prompt: request.prompt,
          size: request.size,
        },
        request.credential.value,
      );

      return {
        images: (response.data ?? []).map((image) => ({
          url: image.url ?? '',
        })),
        usage: {
          imageCount: Array.isArray(response.data) ? response.data.length : 0,
          raw: response.usage,
        },
        raw: this.toRecord(response),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createEmbedding(request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    try {
      const { OpenRouter } = await loadOpenRouterSdkModule();
      const client = new OpenRouter(this.buildClientOptions(request.credential.value));
      const response = await client.embeddings.generate({
        requestBody: {
          model: request.model.apiModelName,
          input: request.input,
        },
      });
      const payload = this.normalizeEmbeddingResponse(response);

      return {
        embedding: payload.data?.[0]?.embedding ?? [],
        usage: {
          totalTokens: payload.usage?.totalTokens,
          embeddingCount: Array.isArray(payload.data) ? payload.data.length : 0,
          raw: this.toRecord(payload.usage),
        },
        raw: this.toRecord(payload),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private buildClientOptions(apiKey: string): OpenRouterOptions {
    const timeoutMs = this.resolveTimeoutMs();

    return {
      apiKey,
      serverURL: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER ?? process.env.APP_URL,
      appTitle: process.env.OPENROUTER_APP_TITLE ?? 'Workana AI',
      ...(timeoutMs ? { timeoutMs } : {}),
    };
  }

  private resolveTimeoutMs() {
    const rawValue = process.env.OPENROUTER_TIMEOUT_MS;
    if (!rawValue) {
      return undefined;
    }

    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private buildRequestHeaders(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...((process.env.OPENROUTER_HTTP_REFERER ?? process.env.APP_URL)
        ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? process.env.APP_URL ?? '' }
        : {}),
      ...(process.env.OPENROUTER_APP_TITLE ? { 'X-Title': process.env.OPENROUTER_APP_TITLE } : {}),
    };
  }

  private resolveBaseUrl() {
    return (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  }

  private async postJson<T>(
    path: string,
    body: Record<string, unknown>,
    apiKey: string,
  ): Promise<T> {
    const timeoutMs = this.resolveTimeoutMs();
    const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
      method: 'POST',
      headers: this.buildRequestHeaders(apiKey),
      body: JSON.stringify(body),
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });

    if (!response.ok) {
      const message = await this.readErrorMessage(response);
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        message,
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  private async readErrorMessage(response: Response) {
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      return data.error?.message ?? `Provider request failed with status ${response.status}`;
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
  }

  private normalizeEmbeddingResponse(response: unknown): OpenRouterEmbeddingPayload {
    if (typeof response === 'string') {
      return JSON.parse(response) as OpenRouterEmbeddingPayload;
    }

    return response as OpenRouterEmbeddingPayload;
  }

  private tryParseStructuredOutput(text: string) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private mapUsage(
    usage:
      | {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
          cost?: number | null;
        }
      | null
      | undefined,
  ) {
    return {
      promptTokens: usage?.inputTokens,
      completionTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
      raw: this.toRecord(usage),
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private mapErrorCategory(statusCode: number): 'auth' | 'rate_limit' | 'validation' | 'unknown' {
    if (statusCode === 401 || statusCode === 403 || statusCode === 402) {
      return 'auth';
    }

    if (statusCode === 400 || statusCode === 404 || statusCode === 422) {
      return 'validation';
    }

    if (statusCode === 429) {
      return 'rate_limit';
    }

    return 'unknown';
  }

  private normalizeError(error: unknown) {
    const statusCode =
      typeof error === 'object' && error
        ? 'statusCode' in error
          ? (error as { statusCode?: number }).statusCode
          : 'response' in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined
        : undefined;

    if (error instanceof ProviderExecutionError) {
      return error;
    }

    if (statusCode === 401 || statusCode === 403 || statusCode === 402) {
      return new ProviderExecutionError(
        this.provider,
        'auth',
        'Provider authentication failed',
        statusCode,
      );
    }

    if (statusCode === 400 || statusCode === 404 || statusCode === 422) {
      return new ProviderExecutionError(
        this.provider,
        'validation',
        'Provider rejected the request',
        statusCode,
      );
    }

    if (statusCode === 429) {
      return new ProviderExecutionError(
        this.provider,
        'rate_limit',
        'Provider rate limit exceeded',
        statusCode,
      );
    }

    const message = error instanceof Error ? error.message : 'Provider request failed';
    return new ProviderExecutionError(this.provider, 'unknown', message, statusCode);
  }
}
