import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AIModel, AIProvider, AIProviderPolicy } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AIRuntimeCapability,
  type AIRuntimeEmbeddingResult,
  type AIRuntimeImageResult,
  type AIRuntimeResolvedCredential,
  type AIRuntimeResolvedModel,
  type AIRuntimeTextResult,
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './adapters/ai-provider.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';

type RuntimeModelRecord = AIModel & { provider: AIProvider };

type BaseRuntimeRequest = {
  organizationId?: string;
  providerId?: string;
  modelId?: string;
};

export type GenerateTextInput = BaseRuntimeRequest & {
  prompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxOutputTokens?: number;
  structuredOutputSchema?: Record<string, unknown>;
};

export type GenerateImageInput = BaseRuntimeRequest & {
  prompt: string;
  size?: string;
};

export type CreateEmbeddingInput = BaseRuntimeRequest & {
  input: string;
};

@Injectable()
export class AIRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterAdapter: OpenRouterAdapter,
    private readonly openAIAdapter: OpenAIAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {}

  async generateText(request: GenerateTextInput) {
    const resolved = await this.resolveExecution(request, 'text_generation');

    try {
      const result = await resolved.adapter.generateText({
        credential: resolved.credential,
        model: resolved.modelRef,
        prompt: request.prompt,
        messages: request.messages,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        structuredOutputSchema: request.structuredOutputSchema,
      });

      return this.attachExecutionMetadata(result, resolved);
    } catch (error) {
      throw this.normalizeRuntimeError(error, resolved.model.provider.slug);
    }
  }

  async generateImage(request: GenerateImageInput) {
    const resolved = await this.resolveExecution(request, 'image_generation');

    try {
      const result = await resolved.adapter.generateImage({
        credential: resolved.credential,
        model: resolved.modelRef,
        prompt: request.prompt,
        size: request.size,
      });

      return this.attachExecutionMetadata(result, resolved);
    } catch (error) {
      throw this.normalizeRuntimeError(error, resolved.model.provider.slug);
    }
  }

  async createEmbedding(request: CreateEmbeddingInput) {
    const resolved = await this.resolveExecution(request, 'embeddings');

    try {
      const result = await resolved.adapter.createEmbedding({
        credential: resolved.credential,
        model: resolved.modelRef,
        input: request.input,
      });

      return this.attachExecutionMetadata(result, resolved);
    } catch (error) {
      throw this.normalizeRuntimeError(error, resolved.model.provider.slug);
    }
  }

  private async resolveExecution(request: BaseRuntimeRequest, capability: AIRuntimeCapability) {
    const providerPolicies = request.organizationId
      ? await this.prisma.aIProviderPolicy.findMany({
          where: {
            organizationId: request.organizationId,
            ...(request.providerId ? { providerId: request.providerId } : {}),
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

    const candidateModel = await this.selectModel(request, capability, providerPolicies);
    const policy =
      providerPolicies.find((candidate) => candidate.providerId === candidateModel.providerId) ??
      null;
    const credential = await this.resolveCredential(
      request.organizationId,
      candidateModel.providerId,
      candidateModel.provider.slug,
      policy,
    );
    const adapter = this.resolveAdapter(
      candidateModel.provider.slug,
      candidateModel.provider.schemaMetadata,
    );

    if (!adapter.supports(capability)) {
      throw new BadRequestException(
        `Provider ${candidateModel.provider.slug} does not support ${capability}`,
      );
    }

    const modelRef: AIRuntimeResolvedModel = {
      id: candidateModel.id,
      slug: candidateModel.slug,
      apiModelName: candidateModel.externalModelId,
      providerSlug: candidateModel.provider.slug,
    };

    return { adapter, credential, model: candidateModel, modelRef };
  }

  private async selectModel(
    request: BaseRuntimeRequest,
    capability: AIRuntimeCapability,
    policies: AIProviderPolicy[],
  ) {
    const candidates = await this.prisma.aIModel.findMany({
      where: {
        status: 'active',
        ...(request.modelId ? { id: request.modelId } : {}),
        ...(request.providerId ? { providerId: request.providerId } : {}),
      },
      include: { provider: true },
      orderBy: { updatedAt: 'desc' },
    });

    const policyAllowedModelIds = Array.from(
      new Set(
        policies.flatMap((policyItem) =>
          Array.isArray(policyItem.allowedModelIds) ? policyItem.allowedModelIds : [],
        ),
      ),
    );

    const eligible = candidates.filter((candidate) => {
      if (!this.modelSupportsCapability(candidate.capabilityMetadata, capability)) {
        return false;
      }

      if (policyAllowedModelIds.length > 0 && !policyAllowedModelIds.includes(candidate.id)) {
        return false;
      }

      // A provider without a usable adapter (e.g. a model mis-tagged with a
      // capability it can't serve) must be skipped, never break the whole
      // selection — otherwise one bad model nukes all generation for the org.
      let adapter: ReturnType<AIRuntimeService['resolveAdapter']>;
      try {
        adapter = this.resolveAdapter(candidate.provider.slug, candidate.provider.schemaMetadata);
      } catch {
        return false;
      }

      return adapter.supports(capability);
    });

    eligible.sort(
      (left, right) => (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0),
    );

    const model = request.modelId
      ? (eligible.find((candidate) => candidate.id === request.modelId) ?? eligible[0])
      : eligible[0];

    if (!model) {
      throw new BadRequestException(`No active model supports ${capability}`);
    }

    return model;
  }

  private async resolveCredential(
    organizationId: string | undefined,
    providerId: string,
    providerSlug: string,
    policy: AIProviderPolicy | null,
  ): Promise<AIRuntimeResolvedCredential> {
    const allowCompanyCredentials =
      policy?.metadata &&
      typeof policy.metadata === 'object' &&
      !Array.isArray(policy.metadata) &&
      (policy.metadata as Record<string, unknown>).allowCompanyCredentials === true;

    if (organizationId && allowCompanyCredentials) {
      const companyCredential = await this.prisma.aICredential.findFirst({
        where: { organizationId, providerId },
        orderBy: { updatedAt: 'desc' },
      });

      if (companyCredential) {
        return { id: companyCredential.id, value: companyCredential.value, scope: 'company' };
      }
    }

    const platformCredential = await this.prisma.aICredential.findFirst({
      where: { organizationId: null, providerId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!platformCredential) {
      const envCredential = this.resolveEnvCredential(providerSlug);
      if (envCredential) {
        return envCredential;
      }

      throw new NotFoundException('No credential available for the selected provider');
    }

    return { id: platformCredential.id, value: platformCredential.value, scope: 'platform' };
  }

  private resolveEnvCredential(providerSlug: string): AIRuntimeResolvedCredential | null {
    const envMap: Record<string, string | undefined> = {
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
    };

    const value = envMap[providerSlug]?.trim();
    if (!value) {
      return null;
    }

    if (value === 'change-me') {
      return null;
    }

    return {
      id: `env:${providerSlug}`,
      value,
      scope: 'platform',
    };
  }

  private resolveAdapter(providerSlug: string, schemaMetadata: unknown) {
    const adapterKey =
      schemaMetadata &&
      typeof schemaMetadata === 'object' &&
      !Array.isArray(schemaMetadata) &&
      typeof (schemaMetadata as Record<string, unknown>).adapter === 'string'
        ? ((schemaMetadata as Record<string, unknown>).adapter as string)
        : providerSlug;

    switch (adapterKey) {
      case 'openrouter':
        return this.openRouterAdapter;
      case 'openai':
        return this.openAIAdapter;
      case 'anthropic':
        return this.anthropicAdapter;
      case 'gemini':
        return this.geminiAdapter;
      default:
        throw new ProviderNotConfiguredError(providerSlug);
    }
  }

  private modelSupportsCapability(metadata: unknown, capability: AIRuntimeCapability) {
    const flags =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};

    const capabilityKeys: Record<AIRuntimeCapability, string[]> = {
      text_generation: ['supportsTextGeneration', 'text'],
      image_generation: ['supportsImageGeneration', 'image'],
      embeddings: ['supportsEmbeddings', 'embeddings'],
      structured_output: ['supportsStructuredOutput', 'structuredOutput'],
    };

    return capabilityKeys[capability].some((key) => flags[key] === true);
  }

  private attachExecutionMetadata<
    T extends AIRuntimeTextResult | AIRuntimeImageResult | AIRuntimeEmbeddingResult,
  >(
    result: T,
    resolved: {
      credential: AIRuntimeResolvedCredential;
      model: RuntimeModelRecord;
      modelRef: AIRuntimeResolvedModel;
    },
  ) {
    return {
      ...result,
      modelId: resolved.model.id,
      modelSlug: resolved.model.slug,
      providerId: resolved.model.providerId,
      providerSlug: resolved.model.provider.slug,
      credentialScope: resolved.credential.scope,
      credentialId: resolved.credential.id,
    };
  }

  private normalizeRuntimeError(error: unknown, providerSlug: string) {
    if (error instanceof ProviderExecutionError || error instanceof ProviderNotConfiguredError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Provider execution failed';
    throw new ProviderExecutionError(providerSlug, 'unknown', message);
  }
}
