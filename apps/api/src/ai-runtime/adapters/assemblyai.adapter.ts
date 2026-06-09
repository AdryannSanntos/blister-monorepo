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

interface AssemblyAiChatResponse {
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

type ChatMessage = AiRuntimeTextRequest['messages'][number];

/**
 * AssemblyAI maps `response_format.json_schema` to Anthropic's `output_config.format`
 * for Claude models. Several Claude builds reject that field with:
 * "output_config.format: Extra inputs are not permitted".
 *
 * For those models we fall back to prompt-guided JSON + `json-repair` post-processing.
 */
const normalizeAssemblyAiModelId = (model: string): string =>
  model.toLowerCase().replace(/^anthropic\//, '');

export const assemblyAiModelUsesPromptJson = (model: string): boolean => {
  const normalized = normalizeAssemblyAiModelId(model);

  if (normalized.startsWith('claude-')) {
    return true;
  }

  if (normalized.startsWith('gpt-oss')) {
    return true;
  }

  return false;
};

/**
 * Anthropic reasoning models (Claude 4.6/4.7 family) reject `temperature` and
 * other sampling params when proxied through AssemblyAI's LLM Gateway.
 */
export const assemblyAiModelSupportsTemperature = (model: string): boolean => {
  const normalized = normalizeAssemblyAiModelId(model);

  if (/claude-(opus|sonnet)-4-[67](?:$|[-_])/.test(normalized)) {
    return false;
  }

  return true;
};

const buildAssemblyAiChatBody = (
  request: AiRuntimeTextRequest,
  options?: { stream?: boolean },
): Record<string, unknown> => {
  const usePromptJson =
    Boolean(request.structuredOutputSchema) &&
    assemblyAiModelUsesPromptJson(request.model);

  const messages =
    usePromptJson && request.structuredOutputSchema
      ? appendJsonSchemaInstruction(request.messages, request.structuredOutputSchema)
      : request.messages;

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens ?? 4096,
  };

  if (assemblyAiModelSupportsTemperature(request.model)) {
    body.temperature = request.temperature ?? 0.7;
  }

  if (options?.stream) {
    body.stream = true;
  }

  if (request.structuredOutputSchema) {
    body.post_processing_steps = [{ type: 'json-repair' }];

    if (!usePromptJson) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          strict: true,
          schema: request.structuredOutputSchema,
        },
      };
    }
  }

  return body;
};

const appendJsonSchemaInstruction = (
  messages: ChatMessage[],
  schema: Record<string, unknown>,
): ChatMessage[] => {
  const instruction = [
    'Return valid JSON only that matches this JSON Schema.',
    'Do not wrap the JSON in markdown fences or add commentary.',
    JSON.stringify(schema, null, 2),
  ].join('\n\n');

  const copy = [...messages];
  let systemIndex = -1;
  for (let index = copy.length - 1; index >= 0; index -= 1) {
    if (copy[index]?.role === 'system') {
      systemIndex = index;
      break;
    }
  }

  if (systemIndex >= 0) {
    copy[systemIndex] = {
      ...copy[systemIndex],
      content: `${copy[systemIndex].content}\n\n${instruction}`,
    };
    return copy;
  }

  copy.unshift({ role: 'system', content: instruction });
  return copy;
};

const parseStructuredContent = (content: string): Record<string, unknown> | undefined => {
  const trimmed = content.trim();
  if (!trimmed) return undefined;

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const normalized = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(normalized.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
};

@Injectable()
export class AssemblyAiAdapter implements AiProviderAdapter {
  readonly provider = 'assemblyai';
  private readonly logger = new Logger(AssemblyAiAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ASSEMBLYAI_API_KEY') ?? '';
    this.baseUrl =
      this.config.get<string>('ASSEMBLYAI_LLM_GATEWAY_BASE_URL') ??
      'https://llm-gateway.assemblyai.com/v1';
  }

  supports(capability: AiRuntimeCapability): boolean {
    return ['text_generation', 'structured_output'].includes(capability);
  }

  async generateText(request: AiRuntimeTextRequest): Promise<AiRuntimeTextResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    const body = buildAssemblyAiChatBody(request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`AssemblyAI completion failed: ${error}`);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      const data = (await response.json()) as AssemblyAiChatResponse;
      const content = data.choices[0]?.message?.content ?? '';
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;

      let structuredOutput: Record<string, unknown> | undefined;
      if (request.structuredOutputSchema) {
        structuredOutput = parseStructuredContent(content);
        if (!structuredOutput) {
          this.logger.warn('Failed to parse AssemblyAI structured output as JSON');
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
      this.logger.error('AssemblyAI completion failed', error);
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

    const body = buildAssemblyAiChatBody(request, { stream: true });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
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
          const parsed = JSON.parse(data) as AssemblyAiChatResponse;
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

    let structuredOutput: Record<string, unknown> | undefined;
    if (request.structuredOutputSchema && fullContent.trim()) {
      structuredOutput = parseStructuredContent(fullContent);
    }

    return {
      content: fullContent,
      structuredOutput,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason,
    };
  }

  async createEmbedding(
    _request: AiRuntimeEmbeddingRequest,
  ): Promise<AiRuntimeEmbeddingResult> {
    throw new ProviderExecutionError(
      this.provider,
      'validation',
      'AssemblyAI LLM Gateway does not provide embeddings',
    );
  }

  async generateImage(
    _request: AiRuntimeImageRequest,
  ): Promise<AiRuntimeImageResult> {
    throw new ProviderExecutionError(
      this.provider,
      'validation',
      'AssemblyAI LLM Gateway does not support image generation',
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private mapErrorCategory(
    status: number,
  ): 'auth' | 'rate_limit' | 'validation' | 'unknown' {
    if (status === 401 || status === 403) return 'auth';
    if (status === 402) return 'validation';
    if (status === 429) return 'rate_limit';
    if (status >= 400 && status < 500) return 'validation';
    return 'unknown';
  }
}
