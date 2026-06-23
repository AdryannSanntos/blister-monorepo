import type { PrismaClient } from '@company-os/db';
import { CapabilityNotConfiguredError } from '../../errors';
import type { ProviderSecrets, ResolvedProviderSecret } from '../../types';
import { resolveProviderSecrets } from '../secrets/secrets-resolver';
import {
  resolvePlatformCaptionModel,
  resolvePlatformEmbeddingModel,
  resolveStepModel,
  type ResolvedModel,
} from '../resolvers/model-resolver';
import type { ITextProvider } from '../text/text-provider';
import { GeminiTextAdapter, OpenRouterTextAdapter, AssemblyAiTextAdapter } from '../text/adapters';
import type { ITranscriptionProvider } from '../transcription/transcription-provider';
import { AssemblyAiSttAdapter } from '../transcription/adapters';
import type { IEmbeddingProvider } from '../embedding/embedding-provider';
import {
  GeminiEmbeddingAdapter,
  OpenRouterEmbeddingAdapter,
  RAG_EMBEDDING_DIMENSIONS,
} from '../embedding/adapters';
import type { IImageProvider } from '../image/image-provider';

/** An `ITextProvider` whose model is already bound to a resolved policy. */
export interface BoundTextProvider extends ITextProvider {
  /** The resolved external model id all completions use. */
  readonly model: string;
  /** The full resolved model (provider slug, label, pricing) — for cost calc. */
  readonly resolved: ResolvedModel;
}

export interface ResolveTextParams {
  agentId: string;
  stepKey?: string;
  requiredCapabilities?: string[];
}

/**
 * Resolves a model id → provider slug → env secrets → a concrete adapter for
 * each capability. This is the only place adapters are instantiated; `agents/`
 * and the backend shell never construct adapters directly.
 */
export class AdapterFactory {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secrets: ProviderSecrets,
  ) {}

  /** Builds a text provider bound to an agent/step's resolved model. */
  async createText(params: ResolveTextParams): Promise<BoundTextProvider> {
    const model = await resolveStepModel(this.prisma, params);
    const secret = resolveProviderSecrets(this.secrets, model.providerSlug);
    const base = this.buildTextAdapter(model.providerSlug, secret);
    return bindTextModel(base, model);
  }

  /** Builds a text provider for an explicit resolved model (e.g. caption). */
  createTextForModel(model: ResolvedModel): BoundTextProvider {
    const secret = resolveProviderSecrets(this.secrets, model.providerSlug);
    const base = this.buildTextAdapter(model.providerSlug, secret);
    return bindTextModel(base, model);
  }

  /** Builds the speech-to-text provider (AssemblyAI). */
  createTranscription(): ITranscriptionProvider {
    const secret = resolveProviderSecrets(this.secrets, 'assemblyai');
    return new AssemblyAiSttAdapter({
      apiKey: secret.apiKey,
      sttBaseUrl: secret.sttBaseUrl,
    });
  }

  /** Builds the embedding provider from the platform embedding model. */
  async createEmbedding(): Promise<IEmbeddingProvider> {
    const model = await resolvePlatformEmbeddingModel(this.prisma);
    const secret = resolveProviderSecrets(this.secrets, model.providerSlug);
    return this.buildEmbeddingAdapter(
      model.providerSlug,
      secret,
      model.externalModelId,
    );
  }

  /**
   * Builds a text provider for the platform caption model, or `null` when no
   * caption model is configured.
   */
  async createCaption(): Promise<{ provider: BoundTextProvider; model: string } | null> {
    const model = await resolvePlatformCaptionModel(this.prisma);
    if (!model) return null;
    return {
      provider: this.createTextForModel(model),
      model: model.externalModelId,
    };
  }

  /** No image adapter is wired yet. */
  createImage(): IImageProvider {
    throw new CapabilityNotConfiguredError('image');
  }

  private buildTextAdapter(
    slug: string,
    secret: ResolvedProviderSecret,
  ): ITextProvider {
    switch (slug) {
      case 'openrouter':
        return new OpenRouterTextAdapter({
          apiKey: secret.apiKey,
          baseUrl: secret.baseUrl,
          httpReferer: secret.httpReferer,
          appTitle: secret.appTitle,
        });
      case 'gemini':
        return new GeminiTextAdapter({
          apiKey: secret.apiKey,
          baseUrl: secret.baseUrl,
        });
      case 'assemblyai':
        return new AssemblyAiTextAdapter({
          apiKey: secret.apiKey,
          baseUrl: secret.llmGatewayBaseUrl,
        });
      default:
        throw new CapabilityNotConfiguredError('text', slug);
    }
  }

  private buildEmbeddingAdapter(
    slug: string,
    secret: ResolvedProviderSecret,
    model: string,
  ): IEmbeddingProvider {
    switch (slug) {
      case 'openrouter':
        return new OpenRouterEmbeddingAdapter({
          apiKey: secret.apiKey,
          baseUrl: secret.baseUrl,
          model,
          dimensions: RAG_EMBEDDING_DIMENSIONS,
        });
      case 'gemini':
        return new GeminiEmbeddingAdapter({
          apiKey: secret.apiKey,
          baseUrl: secret.baseUrl,
          model,
          dimensions: RAG_EMBEDDING_DIMENSIONS,
        });
      default:
        throw new CapabilityNotConfiguredError('embedding', slug);
    }
  }
}

const bindTextModel = (
  base: ITextProvider,
  resolved: ResolvedModel,
): BoundTextProvider => {
  const model = resolved.externalModelId;
  return {
    provider: base.provider,
    model,
    resolved,
    complete: (params) => base.complete({ ...params, model }),
    stream: (params) => base.stream({ ...params, model }),
  };
};
