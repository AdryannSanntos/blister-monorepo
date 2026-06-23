import type { PrismaClient } from '@company-os/db';
import type { ProviderSecrets } from '../../types';
import type { IEmbeddingProvider } from '../embedding/embedding-provider';
import type { IImageProvider } from '../image/image-provider';
import { RagService } from '../rag';
import type { ITranscriptionProvider } from '../transcription/transcription-provider';
import {
  AdapterFactory,
  type BoundTextProvider,
  type ResolveTextParams,
} from './adapter-factory';

export interface AiRuntimeDeps {
  prisma: PrismaClient;
  secrets: ProviderSecrets;
}

/**
 * Capability façade handed to the backend as `sdk.ia`. Text and embedding are
 * methods (they resolve a model from the catalog/platform settings per call, so
 * admin changes apply without a restart); transcription/image are constructed
 * on demand; `rag` is pre-wired with per-operation provider resolution.
 */
export class AiRuntime {
  readonly factory: AdapterFactory;
  readonly rag: RagService;

  constructor(deps: AiRuntimeDeps) {
    this.factory = new AdapterFactory(deps.prisma, deps.secrets);
    this.rag = new RagService({
      prisma: deps.prisma,
      resolveEmbedding: () => this.factory.createEmbedding(),
      resolveCaption: () => this.factory.createCaption(),
    });
  }

  /** Text provider bound to an agent/step's resolved model. */
  text(params: ResolveTextParams): Promise<BoundTextProvider> {
    return this.factory.createText(params);
  }

  /** Speech-to-text provider (AssemblyAI). */
  transcription(): ITranscriptionProvider {
    return this.factory.createTranscription();
  }

  /** Embedding provider resolved from the platform embedding model. */
  embedding(): Promise<IEmbeddingProvider> {
    return this.factory.createEmbedding();
  }

  /** Image provider — throws `CapabilityNotConfiguredError` until one is wired. */
  image(): IImageProvider {
    return this.factory.createImage();
  }
}
