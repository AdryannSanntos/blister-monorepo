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
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

const ASSEMBLYAI_STT_MODELS: AIProviderListedModel[] = [
  {
    slug: 'universal-3-pro',
    name: 'Universal-3 Pro',
    externalModelId: 'universal-3-pro',
    description: 'Highest accuracy pre-recorded speech-to-text model.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, audio_intelligence: true, realtime: false },
    pricingMetadata: {},
    limitsMetadata: { languages: ['en', 'es', 'de', 'fr', 'pt', 'it'] },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'pre-recorded' },
  },
  {
    slug: 'universal-2',
    name: 'Universal-2',
    externalModelId: 'universal-2',
    description: 'Broad-language pre-recorded speech-to-text model.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, audio_intelligence: true, realtime: false },
    pricingMetadata: {},
    limitsMetadata: { languages: 99 },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'pre-recorded' },
  },
  {
    slug: 'u3-rt-pro',
    name: 'u3-rt-pro',
    externalModelId: 'u3-rt-pro',
    description: 'Lowest-latency streaming voice-agent model.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, realtime: true, audio_intelligence: true },
    pricingMetadata: {},
    limitsMetadata: { languages: ['en', 'es', 'de', 'fr', 'pt', 'it'] },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'streaming' },
  },
  {
    slug: 'universal-streaming-english',
    name: 'Universal Streaming English',
    externalModelId: 'universal-streaming-english',
    description: 'Streaming English-only model optimized for low latency.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, realtime: true },
    pricingMetadata: {},
    limitsMetadata: { languages: ['en'] },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'streaming' },
  },
  {
    slug: 'universal-streaming-multilingual',
    name: 'Universal Streaming Multilingual',
    externalModelId: 'universal-streaming-multilingual',
    description: 'Streaming multilingual transcription model.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, realtime: true },
    pricingMetadata: {},
    limitsMetadata: { languages: 6 },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'streaming' },
  },
  {
    slug: 'whisper-rt',
    name: 'Whisper RT',
    externalModelId: 'whisper-rt',
    description: 'Streaming multilingual model with widest language support.',
    status: 'active',
    capabilityMetadata: { speech_to_text: true, realtime: true },
    pricingMetadata: {},
    limitsMetadata: { languages: '99+' },
    schemaMetadata: { providerManaged: true, modality: 'speech-to-text', mode: 'streaming' },
  },
];

@Injectable()
export class AssemblyAIAdapter implements AIProviderAdapter {
  readonly provider = 'assemblyai';

  supports(_capability: AIRuntimeCapability) {
    return false;
  }

  async listModels(_credential: AIRuntimeResolvedCredential): Promise<AIProviderListedModel[]> {
    return ASSEMBLYAI_STT_MODELS;
  }

  async generateText(_request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  async generateImage(_request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }

  async createEmbedding(_request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult> {
    throw new ProviderNotConfiguredError(this.provider);
  }
}
