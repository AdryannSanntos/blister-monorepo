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

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiEmbedResponse {
  embedding?: {
    values?: number[];
  };
}

@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  readonly provider = 'gemini';
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.baseUrl =
      this.config.get<string>('GEMINI_BASE_URL') ??
      'https://generativelanguage.googleapis.com/v1beta';
  }

  supports(capability: AiRuntimeCapability): boolean {
    return [
      'text_generation',
      'embeddings',
      'structured_output',
      'image_generation',
    ].includes(capability);
  }

  async generateText(request: AiRuntimeTextRequest): Promise<AiRuntimeTextResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    const { contents, systemInstruction } = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};

    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }

    if (request.structuredOutputSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = request.structuredOutputSchema;
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    try {
      const url = this.buildUrl(request.model, 'generateContent');
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.readErrorMessage(response);
        this.logger.error(`Gemini completion failed: ${error}`);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      const data = (await response.json()) as GeminiGenerateResponse;

      const content =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join('') ?? '';

      const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

      let structuredOutput: Record<string, unknown> | undefined;
      if (request.structuredOutputSchema) {
        try {
          structuredOutput = JSON.parse(content) as Record<string, unknown>;
        } catch {
          this.logger.warn('Failed to parse Gemini structured output as JSON');
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
        finishReason: data.candidates?.[0]?.finishReason ?? 'STOP',
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('Gemini completion failed', error);
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

    const { contents, systemInstruction } = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};

    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    try {
      const url = this.buildUrl(request.model, 'streamGenerateContent') + '&alt=sse';
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.readErrorMessage(response);
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
      let finishReason = 'STOP';

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
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as GeminiGenerateResponse;
            const content =
              parsed.candidates?.[0]?.content?.parts
                ?.map((p) => p.text)
                .filter(Boolean)
                .join('') ?? '';

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

      let structuredOutput: Record<string, unknown> | undefined;
      if (request.structuredOutputSchema && fullContent.trim()) {
        try {
          structuredOutput = JSON.parse(fullContent) as Record<string, unknown>;
        } catch {
          this.logger.warn('Failed to parse Gemini streamed structured output as JSON');
        }
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
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('Gemini stream failed', error);
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
    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (const text of inputs) {
      try {
        const url = this.buildUrl(request.model, 'embedContent');
        const body: Record<string, unknown> = {
          content: {
            parts: [{ text }],
          },
          taskType: 'RETRIEVAL_DOCUMENT',
        };

        if (request.dimensions) {
          body.outputDimensionality = request.dimensions;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await this.readErrorMessage(response);
          this.logger.error(`Gemini embedding failed: ${error}`);
          throw new ProviderExecutionError(
            this.provider,
            this.mapErrorCategory(response.status),
            error,
            response.status,
          );
        }

        const data = (await response.json()) as GeminiEmbedResponse;

        if (data.embedding?.values) {
          embeddings.push(data.embedding.values);
          totalTokens += Math.ceil(text.length / 4);
        }
      } catch (error) {
        if (error instanceof ProviderExecutionError) throw error;
        this.logger.error('Gemini embedding failed', error);
        throw new ProviderExecutionError(
          this.provider,
          'unknown',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    const dimensions = embeddings[0]?.length ?? request.dimensions ?? 768;

    return {
      embeddings,
      usage: {
        promptTokens: totalTokens,
        completionTokens: 0,
        totalTokens,
      },
      dimensions,
    };
  }

  async generateImage(request: AiRuntimeImageRequest): Promise<AiRuntimeImageResult> {
    if (!this.apiKey) {
      throw new ProviderNotConfiguredError(this.provider);
    }

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    };

    try {
      const url = this.buildUrl(request.model, 'generateContent');
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.readErrorMessage(response);
        this.logger.error(`Gemini image generation failed: ${error}`);
        throw new ProviderExecutionError(
          this.provider,
          this.mapErrorCategory(response.status),
          error,
          response.status,
        );
      }

      const data = (await response.json()) as GeminiGenerateResponse;

      const images: Array<{ url?: string; base64?: string }> = [];

      for (const candidate of data.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data && part.inlineData.mimeType) {
            images.push({
              base64: part.inlineData.data,
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            });
          }
        }
      }

      return {
        images,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) throw error;
      this.logger.error('Gemini image generation failed', error);
      throw new ProviderExecutionError(
        this.provider,
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private convertMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): { contents: GeminiContent[]; systemInstruction?: { parts: Array<{ text: string }> } } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const systemInstruction =
      systemMessages.length > 0
        ? {
            parts: systemMessages.map((m) => ({ text: m.content })),
          }
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
    return {
      'Content-Type': 'application/json',
    };
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return (
        payload.error?.message ?? `Provider request failed with status ${response.status}`
      );
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
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
