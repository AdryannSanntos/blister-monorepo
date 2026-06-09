export type AiRuntimeCapability =
  | 'text_generation'
  | 'image_generation'
  | 'embeddings'
  | 'structured_output';

export interface AiRuntimeUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiRuntimeTextRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model: string;
  maxTokens?: number;
  temperature?: number;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface AiRuntimeTextResult {
  content: string;
  structuredOutput?: Record<string, unknown>;
  usage: AiRuntimeUsage;
  finishReason: string;
}

export interface AiRuntimeStreamChunk {
  content: string;
  isLast: boolean;
}

export interface AiRuntimeEmbeddingRequest {
  input: string | string[];
  model: string;
  dimensions?: number;
}

export interface AiRuntimeEmbeddingResult {
  embeddings: number[][];
  usage: AiRuntimeUsage;
  dimensions: number;
}

export interface AiRuntimeImageRequest {
  prompt: string;
  model: string;
  size?: string;
  style?: string;
}

export interface AiRuntimeImageResult {
  images: Array<{ url?: string; base64?: string }>;
  usage: AiRuntimeUsage;
}

export class ProviderNotConfiguredError extends Error {
  constructor(readonly provider: string) {
    super(`${provider} adapter is not configured`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderExecutionError extends Error {
  constructor(
    readonly provider: string,
    readonly category: 'auth' | 'rate_limit' | 'validation' | 'unknown',
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ProviderExecutionError';
  }
}

export interface AiProviderAdapter {
  readonly provider: string;

  supports(capability: AiRuntimeCapability): boolean;

  generateText(request: AiRuntimeTextRequest): Promise<AiRuntimeTextResult>;

  streamText?(
    request: AiRuntimeTextRequest,
  ): AsyncGenerator<AiRuntimeStreamChunk, AiRuntimeTextResult>;

  createEmbedding(
    request: AiRuntimeEmbeddingRequest,
  ): Promise<AiRuntimeEmbeddingResult>;

  generateImage?(request: AiRuntimeImageRequest): Promise<AiRuntimeImageResult>;
}
