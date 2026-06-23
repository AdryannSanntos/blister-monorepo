import { ProviderExecutionError, parseProviderError } from '../../../errors';
import type {
  ITextProvider,
  TextChunk,
  TextCompleteParams,
  TextMessage,
  TextResult,
} from '../text-provider';

export interface AssemblyAiTextAdapterOptions {
  apiKey: string;
  baseUrl?: string;
}

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

const DEFAULT_BASE_URL = 'https://llm-gateway.assemblyai.com/v1';

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

const appendJsonSchemaInstruction = (
  messages: TextMessage[],
  schema: Record<string, unknown>,
): TextMessage[] => {
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

const buildAssemblyAiChatBody = (
  params: TextCompleteParams,
  options?: { stream?: boolean },
): Record<string, unknown> => {
  const usePromptJson =
    Boolean(params.structuredOutputSchema) &&
    assemblyAiModelUsesPromptJson(params.model);

  const messages =
    usePromptJson && params.structuredOutputSchema
      ? appendJsonSchemaInstruction(params.messages, params.structuredOutputSchema)
      : params.messages;

  const body: Record<string, unknown> = {
    model: params.model,
    messages,
    max_tokens: params.maxTokens ?? 4096,
  };

  if (assemblyAiModelSupportsTemperature(params.model)) {
    body.temperature = params.temperature ?? 0.7;
  }

  if (options?.stream) {
    body.stream = true;
  }

  if (params.structuredOutputSchema) {
    body.post_processing_steps = [{ type: 'json-repair' }];

    if (!usePromptJson) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          strict: true,
          schema: params.structuredOutputSchema,
        },
      };
    }
  }

  return body;
};

const parseStructuredContent = (
  content: string,
): Record<string, unknown> | undefined => {
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

/** AssemblyAI LLM Gateway chat-completions adapter implementing the text capability. */
export class AssemblyAiTextAdapter implements ITextProvider {
  readonly provider = 'assemblyai';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: AssemblyAiTextAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async complete(params: TextCompleteParams): Promise<TextResult> {
    const body = buildAssemblyAiChatBody(params);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw parseProviderError(
          this.provider,
          response.status,
          await response.text(),
        );
      }

      const data = (await response.json()) as AssemblyAiChatResponse;
      const content = data.choices[0]?.message?.content ?? '';
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;

      return {
        content,
        structuredOutput: params.structuredOutputSchema
          ? parseStructuredContent(content)
          : undefined,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: data.choices[0]?.finish_reason ?? 'stop',
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async *stream(
    params: TextCompleteParams,
  ): AsyncGenerator<TextChunk, TextResult> {
    const body = buildAssemblyAiChatBody(params, { stream: true });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw parseProviderError(
          this.provider,
          response.status,
          await response.text(),
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

        const lines = decoder
          .decode(value, { stream: true })
          .split('\n')
          .filter((line) => line.startsWith('data: '));

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

      return {
        content: fullContent,
        structuredOutput:
          params.structuredOutputSchema && fullContent.trim()
            ? parseStructuredContent(fullContent)
            : undefined,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason,
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private wrapError(error: unknown): ProviderExecutionError {
    if (error instanceof ProviderExecutionError) return error;
    return new ProviderExecutionError(
      this.provider,
      'unknown',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
