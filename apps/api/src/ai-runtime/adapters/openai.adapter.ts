import { Injectable } from '@nestjs/common';
import {
  type AIProviderAdapter,
  type AIRuntimeCapability,
  type AIRuntimeEmbeddingRequest,
  type AIRuntimeEmbeddingResult,
  type AIRuntimeImageRequest,
  type AIRuntimeImageResult,
  type AIRuntimeTextRequest,
  type AIRuntimeTextResult,
  ProviderNotConfiguredError,
} from './ai-provider.adapter';

@Injectable()
export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = 'openai';

  supports(_capability: AIRuntimeCapability) {
    return false;
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
