import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import type { AiProviderAdapter } from './adapters/ai-provider.adapter';
import { ProviderExecutionError } from './adapters/ai-provider.adapter';

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  tokensUsed: number;
  costUsd: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly adapters: Map<string, AiProviderAdapter>;
  private readonly defaultEmbeddingModel = 'openrouter/openai/text-embedding-3-small';
  private readonly defaultDimensions = 1536;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterAdapter: OpenRouterAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {
    this.adapters = new Map<string, AiProviderAdapter>([
      ['openrouter', this.openRouterAdapter],
      ['gemini', this.geminiAdapter],
    ]);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const { model, providerSlug, externalModel, dimensions } =
      await this.resolveEmbeddingConfig(request.model);

    const adapter = this.getAdapter(providerSlug);

    const result = await adapter.createEmbedding({
      input: request.texts,
      model: externalModel,
      dimensions,
    });

    const tokensUsed = result.usage.totalTokens;
    const costUsd = await this.calculateEmbeddingCost(
      providerSlug,
      externalModel,
      tokensUsed,
    );

    return {
      embeddings: result.embeddings,
      model,
      dimensions: result.dimensions,
      tokensUsed,
      costUsd,
    };
  }

  async embedSingle(text: string, model?: string): Promise<number[]> {
    const response = await this.embed({ texts: [text], model });
    return response.embeddings[0];
  }

  private getAdapter(providerSlug: string): AiProviderAdapter {
    const adapter = this.adapters.get(providerSlug);
    if (!adapter) {
      throw new ProviderExecutionError(
        providerSlug,
        'validation',
        `Unknown embedding provider: ${providerSlug}`,
      );
    }
    return adapter;
  }

  private async resolveEmbeddingConfig(requestedModel?: string): Promise<{
    model: string;
    providerSlug: string;
    externalModel: string;
    dimensions: number;
  }> {
    if (requestedModel) {
      const { providerSlug, externalModel } = this.parseModelString(requestedModel);
      return {
        model: requestedModel,
        providerSlug,
        externalModel,
        dimensions: this.defaultDimensions,
      };
    }

    const settings = await this.prisma.ragPlatformSettings.findUnique({
      where: { id: 'default' },
      include: { embeddingModel: { include: { provider: true } } },
    });

    if (settings?.embeddingModel?.provider) {
      const providerSlug = settings.embeddingModel.provider.slug;
      const externalModel = settings.embeddingModel.externalId;
      const model = `${providerSlug}/${externalModel}`;
      return {
        model,
        providerSlug,
        externalModel,
        dimensions: this.defaultDimensions,
      };
    }

    const { providerSlug, externalModel } = this.parseModelString(
      this.defaultEmbeddingModel,
    );
    return {
      model: this.defaultEmbeddingModel,
      providerSlug,
      externalModel,
      dimensions: this.defaultDimensions,
    };
  }

  private parseModelString(model: string): {
    providerSlug: string;
    externalModel: string;
  } {
    const parts = model.split('/');
    if (parts.length < 2) {
      return { providerSlug: 'openrouter', externalModel: model };
    }
    const providerSlug = parts[0];
    const externalModel = parts.slice(1).join('/');
    return { providerSlug, externalModel };
  }

  private async calculateEmbeddingCost(
    providerSlug: string,
    externalId: string,
    tokensUsed: number,
  ): Promise<number> {
    const aiModel = await this.prisma.aiModel.findFirst({
      where: {
        externalId,
        provider: { slug: providerSlug },
      },
    });

    if (!aiModel) {
      return 0;
    }

    return (tokensUsed / 1000) * Number(aiModel.inputCostPer1k);
  }

  async getDefaultSettings() {
    const settings = await this.prisma.ragPlatformSettings.findUnique({
      where: { id: 'default' },
    });

    return {
      chunkSize: settings?.chunkSize ?? 512,
      chunkOverlap: settings?.chunkOverlap ?? 64,
      topK: settings?.topK ?? 8,
      rerankEnabled: settings?.rerankEnabled ?? true,
    };
  }
}
