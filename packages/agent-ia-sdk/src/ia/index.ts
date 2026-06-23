/**
 * `ia/` public surface — capability **interfaces**, the RAG service, resolvers,
 * the secrets resolver, and the runtime (`AiRuntime` + `AdapterFactory`).
 *
 * Concrete provider adapters (OpenRouter/Gemini/AssemblyAI) are intentionally
 * NOT exported here — only the `AdapterFactory` instantiates them. `agents/`
 * depends solely on the interfaces below.
 */

// Capability interfaces (no concrete adapters)
export type {
  ITextProvider,
  TextChunk,
  TextCompleteParams,
  TextImageInput,
  TextMessage,
  TextResult,
  TextUsage,
} from './text/text-provider';
export type {
  ITranscriptionProvider,
  TranscribeParams,
  TranscriptSegment,
  TranscriptionResult,
  WordTimestamp,
} from './transcription/transcription-provider';
export { TRANSCRIPTION_MAX_WAIT_MS } from './transcription/transcription-provider';
export type {
  IImageProvider,
  ImageGenerateParams,
  ImageResult,
} from './image/image-provider';
export type { IEmbeddingProvider } from './embedding/embedding-provider';

// RAG service + types
export {
  RagService,
  DocumentService,
  ChunkService,
  EmbeddingRepository,
  IngestionService,
  RetrievalService,
  CaptionService,
  type RagServiceDeps,
  type ResolvedCaptionProvider,
  type CaptionInput,
  type IngestResult,
  type VectorSearchResult,
  type VectorSearchOptions,
} from './rag';

// Resolvers + secrets
export {
  resolveModelById,
  resolveStepModel,
  resolveStepSpeechModel,
  resolvePlatformEmbeddingModel,
  resolvePlatformCaptionModel,
  calculateModelCost,
  type ResolvedModel,
} from './resolvers/model-resolver';
export { resolveProviderSecrets } from './secrets/secrets-resolver';
export type {
  ProviderSecrets,
  ProviderSlug,
  ResolvedProviderSecret,
} from './secrets/provider-secrets';

// Runtime
export { AiRuntime, type AiRuntimeDeps } from './runtime/ai-runtime';
export {
  AdapterFactory,
  type BoundTextProvider,
  type ResolveTextParams,
} from './runtime/adapter-factory';
