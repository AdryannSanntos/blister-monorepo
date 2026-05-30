import { Injectable } from '@nestjs/common';
import {
  type AIProviderListedModel,
  type AIProviderAdapter,
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

type AssemblyAIModelDef = {
  slug: string;
  name: string;
  externalModelId: string;
  structuredOutput?: boolean;
  retired?: boolean;
  providerFamily: 'anthropic' | 'openai' | 'google' | 'qwen' | 'moonshot';
};

const ASSEMBLYAI_LLM_MODELS: AssemblyAIModelDef[] = [
  { slug: 'claude-opus-4-7', name: 'Claude Opus 4.7', externalModelId: 'claude-opus-4-7', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-opus-4-6', name: 'Claude Opus 4.6', externalModelId: 'claude-opus-4-6', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', externalModelId: 'claude-sonnet-4-6', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', externalModelId: 'claude-opus-4-5-20251101', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', externalModelId: 'claude-sonnet-4-5-20250929', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', externalModelId: 'claude-haiku-4-5-20251001', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-opus-4-20250514', name: 'Claude Opus 4', externalModelId: 'claude-opus-4-20250514', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', externalModelId: 'claude-sonnet-4-20250514', structuredOutput: true, providerFamily: 'anthropic' },
  { slug: 'gpt-5.2', name: 'GPT-5.2', externalModelId: 'gpt-5.2', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-5.1', name: 'GPT-5.1', externalModelId: 'gpt-5.1', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-5', name: 'GPT-5', externalModelId: 'gpt-5', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-5-nano', name: 'GPT-5 Nano', externalModelId: 'gpt-5-nano', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-5-mini', name: 'GPT-5 Mini', externalModelId: 'gpt-5-mini', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-4.1', name: 'GPT-4.1', externalModelId: 'gpt-4.1', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-oss-120b', name: 'gpt-oss-120b', externalModelId: 'gpt-oss-120b', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gpt-oss-20b', name: 'gpt-oss-20b', externalModelId: 'gpt-oss-20b', structuredOutput: true, providerFamily: 'openai' },
  { slug: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', externalModelId: 'gemini-3-flash-preview', structuredOutput: true, providerFamily: 'google' },
  { slug: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', externalModelId: 'gemini-2.5-pro', structuredOutput: true, providerFamily: 'google' },
  { slug: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', externalModelId: 'gemini-2.5-flash', structuredOutput: true, providerFamily: 'google' },
  { slug: 'gemini-2-5-flash-lite', name: 'Gemini 2.5 Flash-Lite', externalModelId: 'gemini-2.5-flash-lite', structuredOutput: true, providerFamily: 'google' },
  { slug: 'qwen3-next-80b-a3b', name: 'Qwen3 Next 80B', externalModelId: 'qwen3-next-80b-a3b', structuredOutput: true, providerFamily: 'qwen' },
  { slug: 'qwen3-32b', name: 'Qwen3 32B', externalModelId: 'qwen3-32B', structuredOutput: true, providerFamily: 'qwen' },
  { slug: 'kimi-k2-5', name: 'Kimi K2.5', externalModelId: 'kimi-k2.5', structuredOutput: true, providerFamily: 'moonshot' },
];

@Injectable()
export class AssemblyAILlmGatewayAdapter implements AIProviderAdapter {
  readonly provider = 'assemblyai-llm-gateway';

  supports(capability: AIRuntimeCapability) {
    return capability === 'text_generation' || capability === 'structured_output';
  }

  async listModels(_credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    const isEuRegion = this.resolveBaseUrl().includes('.eu.assemblyai.com');

    return ASSEMBLYAI_LLM_MODELS.filter((model) => {
      if (!isEuRegion) {
        return true;
      }

      return model.providerFamily === 'anthropic' || model.providerFamily === 'google';
    }).map((model) => ({
      slug: model.slug,
      name: model.name,
      externalModelId: model.externalModelId,
      description: 'AssemblyAI LLM Gateway model.',
      status: model.retired ? 'disabled' : 'active',
      capabilityMetadata: {
        text: true,
        structuredOutput: model.structuredOutput === true,
      },
      pricingMetadata: {},
      limitsMetadata: {
        region: isEuRegion ? 'eu' : 'global',
        providerFamily: model.providerFamily,
      },
      schemaMetadata: {
        providerManaged: true,
        gateway: 'assemblyai-llm-gateway',
      },
    }));
  }

  async generateText(request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    const body: Record<string, unknown> = {
      model: request.model.apiModelName,
      ...(request.messages?.length
        ? {
            messages: request.messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }
        : { prompt: request.prompt ?? '' }),
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

    const response = await fetch(`${this.resolveBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: request.credential.value,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        await this.readErrorMessage(response),
        response.status,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = payload.choices?.[0]?.message?.content ?? '';

    return {
      text,
      structuredOutput: request.structuredOutputSchema ? this.tryParseStructuredOutput(text) : undefined,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        raw: this.toRecord(payload.usage),
      },
      raw: this.toRecord(payload),
    };
  }

  async generateImage(_request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  async createEmbedding(_request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  private resolveBaseUrl() {
    return (
      process.env.ASSEMBLYAI_LLM_GATEWAY_BASE_URL ?? 'https://llm-gateway.assemblyai.com/v1'
    ).replace(/\/$/, '');
  }

  private async readErrorMessage(response: Response) {
    try {
      const payload = (await response.json()) as { error?: { message?: string } | string; message?: string };
      if (typeof payload.error === 'string') {
        return payload.error;
      }
      return payload.error?.message ?? payload.message ?? `Provider request failed with status ${response.status}`;
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
  }

  private mapErrorCategory(status: number) {
    if (status === 401 || status === 403) return 'auth' as const;
    if (status === 429) return 'rate_limit' as const;
    if (status >= 400 && status < 500) return 'validation' as const;
    return 'unknown' as const;
  }

  private tryParseStructuredOutput(text: string) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private toRecord(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }
}
