import { Injectable } from '@nestjs/common';
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
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

@Injectable()
export class GeminiAdapter implements AIProviderAdapter {
  readonly provider = 'gemini';

  supports(capability: AIRuntimeCapability) {
    return ['text_generation', 'image_generation', 'embeddings', 'structured_output'].includes(
      capability,
    );
  }

  async listModels(credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    const models: Array<{
      name?: string;
      displayName?: string;
      description?: string;
      inputTokenLimit?: number;
      outputTokenLimit?: number;
      supportedGenerationMethods?: string[];
    }> = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${this.resolveBaseUrl()}/models`);
      url.searchParams.set('key', credential.value);
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new ProviderExecutionError(
          this.provider,
          response.status === 401 || response.status === 403 ? 'auth' : 'unknown',
          await this.readErrorMessage(response),
          response.status,
        );
      }

      const payload = (await response.json()) as {
        models?: typeof models;
        nextPageToken?: string;
      };

      models.push(...(payload.models ?? []));
      pageToken = payload.nextPageToken;
    } while (pageToken);

    return models
      .filter(
        (model): model is (typeof models)[number] & { name: string } =>
          typeof model.name === 'string',
      )
      .map((model) => {
        const methods = Array.isArray(model.supportedGenerationMethods)
          ? model.supportedGenerationMethods
          : [];
        const normalizedName = model.name.replace(/^models\//, '');

        return {
          slug: this.slugify(normalizedName),
          name: model.displayName ?? normalizedName,
          externalModelId: normalizedName,
          description: model.description,
          status: 'active' as const,
          capabilityMetadata: {
            text: methods.includes('generateContent'),
            embeddings: methods.includes('embedContent') || methods.includes('batchEmbedContents'),
            image: normalizedName.toLowerCase().includes('imagen'),
            vision: methods.includes('generateContent'),
          },
          pricingMetadata: {},
          limitsMetadata: {
            maxInputTokens: model.inputTokenLimit ?? null,
            maxOutputTokens: model.outputTokenLimit ?? null,
          },
          schemaMetadata: {
            providerManaged: true,
            raw: model,
          },
        };
      });
  }

  async generateText(request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    const response = await fetch(
      this.resolveModelUrl(request.model.apiModelName, 'generateContent', request.credential.value),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: this.toGeminiContents(request),
          ...(this.toSystemInstruction(request)
            ? { systemInstruction: this.toSystemInstruction(request) }
            : {}),
          ...(this.toTextGenerationConfig(request)
            ? { generationConfig: this.toTextGenerationConfig(request) }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        await this.readErrorMessage(response),
        response.status,
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter((value): value is string => typeof value === 'string')
        .join('') ?? '';

    return {
      text,
      structuredOutput: request.structuredOutputSchema
        ? this.tryParseStructuredOutput(text)
        : undefined,
      usage: {
        promptTokens: payload.usageMetadata?.promptTokenCount,
        completionTokens: payload.usageMetadata?.candidatesTokenCount,
        totalTokens: payload.usageMetadata?.totalTokenCount,
        raw: this.toRecord(payload.usageMetadata),
      },
      raw: this.toRecord(payload),
    };
  }

  async generateImage(request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    const prompt = request.size
      ? `${request.prompt}\n\nPreferred image size: ${request.size}.`
      : request.prompt;

    const response = await fetch(
      this.resolveModelUrl(request.model.apiModelName, 'generateContent', request.credential.value),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        await this.readErrorMessage(response),
        response.status,
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
        };
      }>;
    };

    const images =
      payload.candidates?.flatMap(
        (candidate) =>
          candidate.content?.parts?.flatMap((part) => {
            if (!part.inlineData?.data || !part.inlineData.mimeType) {
              return [];
            }

            return [{ url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }];
          }) ?? [],
      ) ?? [];

    return {
      images,
      usage: { imageCount: images.length },
      raw: this.toRecord(payload),
    };
  }

  async createEmbedding(request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    const response = await fetch(
      this.resolveModelUrl(request.model.apiModelName, 'embedContent', request.credential.value),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            parts: [{ text: request.input }],
          },
          taskType: 'RETRIEVAL_DOCUMENT',
        }),
      },
    );

    if (!response.ok) {
      throw new ProviderExecutionError(
        this.provider,
        this.mapErrorCategory(response.status),
        await this.readErrorMessage(response),
        response.status,
      );
    }

    const payload = (await response.json()) as {
      embedding?: {
        values?: number[];
      };
    };

    const embedding = Array.isArray(payload.embedding?.values) ? payload.embedding.values : [];

    return {
      embedding,
      usage: { embeddingCount: embedding.length > 0 ? 1 : 0 },
      raw: this.toRecord(payload),
    };
  }

  private resolveBaseUrl() {
    return (
      process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/$/, '');
  }

  private resolveModelUrl(
    modelName: string,
    action: 'generateContent' | 'embedContent',
    apiKey: string,
  ) {
    const url = new URL(`${this.resolveBaseUrl()}/models/${modelName}:${action}`);
    url.searchParams.set('key', apiKey);
    return url.toString();
  }

  private async readErrorMessage(response: Response) {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message ?? `Provider request failed with status ${response.status}`;
    } catch {
      return `Provider request failed with status ${response.status}`;
    }
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private mapErrorCategory(status: number) {
    if (status === 401 || status === 403) return 'auth' as const;
    if (status === 429) return 'rate_limit' as const;
    if (status >= 400 && status < 500) return 'validation' as const;
    return 'unknown' as const;
  }

  private toSystemInstruction(request: AIRuntimeTextRequest) {
    const systemText = request.messages
      ?.filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join('\n\n');

    return systemText
      ? {
          parts: [{ text: systemText }],
        }
      : undefined;
  }

  private toGeminiContents(request: AIRuntimeTextRequest) {
    const messages = request.messages?.length
      ? request.messages.filter((message) => message.role !== 'system')
      : [{ role: 'user' as const, content: request.prompt ?? '' }];

    return messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
  }

  private toTextGenerationConfig(request: AIRuntimeTextRequest) {
    if (
      request.temperature === undefined &&
      request.maxOutputTokens === undefined &&
      !request.structuredOutputSchema
    ) {
      return undefined;
    }

    return {
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      ...(request.maxOutputTokens !== undefined
        ? { maxOutputTokens: request.maxOutputTokens }
        : {}),
      ...(request.structuredOutputSchema
        ? {
            responseMimeType: 'application/json',
            responseSchema: request.structuredOutputSchema,
          }
        : {}),
    };
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
