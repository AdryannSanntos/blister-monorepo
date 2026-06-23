import { ProviderExecutionError, parseProviderError } from '../../../errors';
import type {
  ITextProvider,
  TextChunk,
  TextCompleteParams,
  TextMessage,
  TextResult,
} from '../text-provider';

export interface GeminiTextAdapterOptions {
  apiKey: string;
  baseUrl?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }>;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini's `responseSchema` accepts only an OpenAPI-3.0 subset of JSON Schema.
 * Strip JSON-Schema-only keywords so structured-output requests don't fail.
 */
const GEMINI_UNSUPPORTED_SCHEMA_KEYS = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'definitions',
  'additionalProperties',
  'const',
  'examples',
]);

const sanitizeGeminiSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeGeminiSchema);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (GEMINI_UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
      result[key] = sanitizeGeminiSchema(child);
    }
    return result;
  }
  return value;
};

/** Google Gemini text adapter implementing the text capability. */
export class GeminiTextAdapter implements ITextProvider {
  readonly provider = 'gemini';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GeminiTextAdapterOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async complete(params: TextCompleteParams): Promise<TextResult> {
    const body = this.buildBody(params, true);

    try {
      const response = await fetch(
        this.buildUrl(params.model, 'generateContent'),
        { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) },
      );

      if (!response.ok) {
        throw parseProviderError(
          this.provider,
          response.status,
          await this.readErrorMessage(response),
        );
      }

      const data = (await response.json()) as GeminiGenerateResponse;
      const content = this.extractContent(data);
      const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

      return {
        content,
        structuredOutput: this.tryParseStructured(params, content),
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: data.candidates?.[0]?.finishReason ?? 'STOP',
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async *stream(
    params: TextCompleteParams,
  ): AsyncGenerator<TextChunk, TextResult> {
    // Gemini's streaming endpoint ignores responseSchema; stream as plain text.
    const body = this.buildBody(params, false);

    try {
      const response = await fetch(
        `${this.buildUrl(params.model, 'streamGenerateContent')}&alt=sse`,
        { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) },
      );

      if (!response.ok) {
        throw parseProviderError(
          this.provider,
          response.status,
          await this.readErrorMessage(response),
        );
      }

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let finishReason = 'STOP';

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
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as GeminiGenerateResponse;
            const content = this.extractContent(parsed);
            if (content) {
              fullContent += content;
              yield { content, isLast: false };
            }
            if (parsed.candidates?.[0]?.finishReason) {
              finishReason = parsed.candidates[0].finishReason;
            }
            if (parsed.usageMetadata) {
              promptTokens = parsed.usageMetadata.promptTokenCount ?? 0;
              completionTokens = parsed.usageMetadata.candidatesTokenCount ?? 0;
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
    includeSchema: boolean,
  ): Record<string, unknown> {
    const { contents, systemInstruction } = this.convertMessages(params.messages);

    // Attach inline images to the last user content (vision input).
    if (params.images && params.images.length > 0) {
      for (let i = contents.length - 1; i >= 0; i -= 1) {
        if (contents[i].role === 'user') {
          for (const image of params.images) {
            contents[i].parts.push({
              inlineData: { mimeType: image.mimeType, data: image.base64 },
            });
          }
          break;
        }
      }
    }

    const body: Record<string, unknown> = { contents };
    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};
    if (params.temperature !== undefined) {
      generationConfig.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = params.maxTokens;
    }
    if (includeSchema && params.structuredOutputSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = sanitizeGeminiSchema(
        params.structuredOutputSchema,
      );
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  }

  private extractContent(data: GeminiGenerateResponse): string {
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('') ?? ''
    );
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

  private convertMessages(messages: TextMessage[]): {
    contents: GeminiContent[];
    systemInstruction?: { parts: Array<{ text: string }> };
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const systemInstruction =
      systemMessages.length > 0
        ? { parts: systemMessages.map((m) => ({ text: m.content })) }
        : undefined;

    const contents: GeminiContent[] = nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return { contents, systemInstruction };
  }

  private buildUrl(model: string, action: string): string {
    const url = new URL(`${this.baseUrl}/models/${model}:${action}`);
    url.searchParams.set('key', this.apiKey);
    return url.toString();
  }

  private getHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      return (
        payload.error?.message ??
        `Provider request failed with status ${response.status}`
      );
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
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
