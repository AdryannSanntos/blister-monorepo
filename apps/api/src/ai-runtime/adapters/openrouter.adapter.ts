import { Injectable } from '@nestjs/common';
import type { OpenRouterOptions } from '@openrouter/agent';
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
} from './ai-provider.adapter';

type OpenRouterAgentModule = typeof import('@openrouter/agent');
type OpenRouterSdkModule = typeof import('@openrouter/sdk');
type OpenRouterEmbeddingPayload = {
  data?: Array<{ embedding?: number[] }>;
  usage?: { totalTokens?: number };
};

const importEsmModule = new Function('specifier', 'return import(specifier)') as <T>(
  specifier: string,
) => Promise<T>;

let openRouterAgentModulePromise: Promise<OpenRouterAgentModule> | null = null;
let openRouterSdkModulePromise: Promise<OpenRouterSdkModule> | null = null;

const loadOpenRouterAgentModule = () => {
  openRouterAgentModulePromise ??= importEsmModule<OpenRouterAgentModule>('@openrouter/agent');
  return openRouterAgentModulePromise;
};

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
        .filter((model): model is NonNullable<typeof payload.data>[number] & { id: string } => typeof model.id === 'string')
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
      const { OpenRouter, fromChatMessages } = await loadOpenRouterAgentModule();
      const client = new OpenRouter(this.buildClientOptions(request.credential.value));
      const result = client.callModel({
        model: request.model.apiModelName,
        input: request.messages?.length
          ? fromChatMessages(
              request.messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            )
          : (request.prompt ?? ''),
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        text: request.structuredOutputSchema
          ? {
              format: {
                type: 'json_schema',
                name: 'structured_output',
                schema: request.structuredOutputSchema,
                strict: true,
              },
            }
          : undefined,
      });

      const [text, response] = await Promise.all([result.getText(), result.getResponse()]);

      return {
        text,
        structuredOutput: request.structuredOutputSchema
          ? this.tryParseStructuredOutput(text)
          : undefined,
        usage: this.mapUsage(response.usage),
        raw: this.toRecord(response),
      };
    } catch (error) {
      throw this.normalizeError(error);
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
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
