import { ProviderExecutionError, parseProviderError } from '../../../errors';
import type {
  ITextProvider,
  TextChunk,
  TextCompleteParams,
  TextResult,
} from '../text-provider';

export interface OpenRouterTextAdapterOptions {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
}

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

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/** OpenRouter chat-completions adapter implementing the text capability. */
export class OpenRouterTextAdapter implements ITextProvider {
  readonly provider = 'openrouter';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpReferer: string;
  private readonly appTitle: string;

  constructor(options: OpenRouterTextAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.httpReferer = options.httpReferer ?? 'https://blister.app';
    this.appTitle = options.appTitle ?? 'Blister';
  }

  async complete(params: TextCompleteParams): Promise<TextResult> {
    const body = this.buildBody(params, false);

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

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message?.content ?? '';
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;

      return {
        content,
        structuredOutput: this.tryParseStructured(params, content),
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
    const body = this.buildBody(params, true);

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
        structuredOutput: fullContent.trim()
          ? this.tryParseStructured(params, fullContent)
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

  private buildBody(
    params: TextCompleteParams,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: this.buildMessages(params),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
    };

    if (stream) {
      body.stream = true;
      // Ask OpenRouter to include token usage in the final chunk so streamed
      // completions can still be billed.
      body.stream_options = { include_usage: true };
    }

    if (params.structuredOutputSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          schema: params.structuredOutputSchema,
        },
      };
    }

    return body;
  }

  /**
   * Returns the messages to send. Without images this is the messages verbatim;
   * with images, the last user turn becomes multimodal content parts.
   */
  private buildMessages(params: TextCompleteParams): unknown[] {
    if (!params.images || params.images.length === 0) {
      return params.messages;
    }

    const lastUserIndex = (() => {
      for (let i = params.messages.length - 1; i >= 0; i -= 1) {
        if (params.messages[i].role === 'user') return i;
      }
      return -1;
    })();

    return params.messages.map((message, index) => {
      if (index !== lastUserIndex) return message;
      return {
        role: message.role,
        content: [
          { type: 'text', text: message.content },
          ...params.images!.map((image) => ({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
          })),
        ],
      };
    });
  }

  private tryParseStructured(
    params: TextCompleteParams,
    content: string,
  ): Record<string, unknown> | undefined {
    if (!params.structuredOutputSchema) return undefined;
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.httpReferer,
      'X-Title': this.appTitle,
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
