import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { AssemblyAiAdapter } from './adapters/assemblyai.adapter';
import type {
  AiProviderAdapter,
  AiRuntimeStreamChunk,
  AiRuntimeTextResult,
} from './adapters/ai-provider.adapter';
import { ProviderExecutionError } from './adapters/ai-provider.adapter';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: Message[];
  model?: string;
  agentId?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface CompletionResponse {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  finishReason: string;
  costUsd: number;
  structuredOutput?: Record<string, unknown>;
}

export interface StreamChunk {
  content: string;
  isLast: boolean;
}

@Injectable()
export class AiRuntimeService {
  private readonly logger = new Logger(AiRuntimeService.name);
  private readonly adapters: Map<string, AiProviderAdapter>;
  private readonly defaultModel = 'openrouter/anthropic/claude-sonnet-4';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly openRouterAdapter: OpenRouterAdapter,
    private readonly geminiAdapter: GeminiAdapter,
    private readonly assemblyAiAdapter: AssemblyAiAdapter,
  ) {
    this.adapters = new Map<string, AiProviderAdapter>([
      ['openrouter', this.openRouterAdapter],
      ['gemini', this.geminiAdapter],
      ['assemblyai', this.assemblyAiAdapter],
    ]);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const { model, providerSlug, externalModel } = await this.resolveModel(
      request.model,
      request.agentId,
    );

    const adapter = this.getAdapter(providerSlug);

    const result = await adapter.generateText({
      messages: request.messages,
      model: externalModel,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      structuredOutputSchema: request.structuredOutputSchema,
    });

    const costUsd = await this.calculateCost(
      providerSlug,
      externalModel,
      result.usage.promptTokens,
      result.usage.completionTokens,
    );

    return {
      content: result.content,
      model,
      tokensInput: result.usage.promptTokens,
      tokensOutput: result.usage.completionTokens,
      finishReason: result.finishReason,
      costUsd,
      structuredOutput: result.structuredOutput,
    };
  }

  async *streamComplete(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk, CompletionResponse> {
    const { model, providerSlug, externalModel } = await this.resolveModel(
      request.model,
      request.agentId,
    );

    const adapter = this.getAdapter(providerSlug);

    if (!adapter.streamText) {
      const result = await adapter.generateText({
        messages: request.messages,
        model: externalModel,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      yield { content: result.content, isLast: true };

      const costUsd = await this.calculateCost(
        providerSlug,
        externalModel,
        result.usage.promptTokens,
        result.usage.completionTokens,
      );

      return {
        content: result.content,
        model,
        tokensInput: result.usage.promptTokens,
        tokensOutput: result.usage.completionTokens,
        finishReason: result.finishReason,
        costUsd,
      };
    }

    const generator = adapter.streamText({
      messages: request.messages,
      model: externalModel,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    let result: AiRuntimeTextResult | undefined;
    let chunk: IteratorResult<AiRuntimeStreamChunk, AiRuntimeTextResult>;

    while (!(chunk = await generator.next()).done) {
      yield { content: chunk.value.content, isLast: chunk.value.isLast };
    }

    result = chunk.value;

    const costUsd = await this.calculateCost(
      providerSlug,
      externalModel,
      result.usage.promptTokens,
      result.usage.completionTokens,
    );

    return {
      content: result.content,
      model,
      tokensInput: result.usage.promptTokens,
      tokensOutput: result.usage.completionTokens,
      finishReason: result.finishReason,
      costUsd,
    };
  }

  private getAdapter(providerSlug: string): AiProviderAdapter {
    const adapter = this.adapters.get(providerSlug);
    if (!adapter) {
      throw new ProviderExecutionError(
        providerSlug,
        'validation',
        `Unknown provider: ${providerSlug}`,
      );
    }
    return adapter;
  }

  private async resolveModel(
    requestedModel?: string,
    agentId?: string,
  ): Promise<{ model: string; providerSlug: string; externalModel: string }> {
    if (requestedModel) {
      const { providerSlug, externalModel } = this.parseModelString(requestedModel);
      return { model: requestedModel, providerSlug, externalModel };
    }

    if (agentId) {
      const policy = await this.prisma.agentModelPolicy.findUnique({
        where: { agentId },
        include: { model: { include: { provider: true } } },
      });

      if (policy?.model?.provider) {
        const providerSlug = policy.model.provider.slug;
        const externalModel = policy.model.externalId;
        const model = `${providerSlug}/${externalModel}`;
        return { model, providerSlug, externalModel };
      }
    }

    const { providerSlug, externalModel } = this.parseModelString(this.defaultModel);
    return { model: this.defaultModel, providerSlug, externalModel };
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

  private async calculateCost(
    providerSlug: string,
    externalId: string,
    tokensInput: number,
    tokensOutput: number,
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

    const inputCost = (tokensInput / 1000) * Number(aiModel.inputCostPer1k);
    const outputCost = (tokensOutput / 1000) * Number(aiModel.outputCostPer1k);

    return inputCost + outputCost;
  }

  async getAvailableModels() {
    return this.prisma.aiModel.findMany({
      where: { isEnabled: true, provider: { isEnabled: true } },
      include: { provider: true },
      orderBy: [{ provider: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  getAdapter$(providerSlug: string): AiProviderAdapter {
    return this.getAdapter(providerSlug);
  }
}
