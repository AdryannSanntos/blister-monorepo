export type AIRuntimeCapability =
  | 'text_generation'
  | 'image_generation'
  | 'embeddings'
  | 'structured_output';

export interface AIRuntimeUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  embeddingCount?: number;
  raw?: Record<string, unknown>;
}

export interface AIRuntimeResolvedCredential {
  id: string;
  value: string;
  scope: 'company' | 'platform';
}

export interface AIRuntimeResolvedModel {
  id: string;
  slug: string;
  apiModelName: string;
  providerSlug: string;
}

export interface AIRuntimeTextRequest {
  credential: AIRuntimeResolvedCredential;
  model: AIRuntimeResolvedModel;
  prompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxOutputTokens?: number;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface AIRuntimeImageRequest {
  credential: AIRuntimeResolvedCredential;
  model: AIRuntimeResolvedModel;
  prompt: string;
  size?: string;
}

export interface AIRuntimeEmbeddingRequest {
  credential: AIRuntimeResolvedCredential;
  model: AIRuntimeResolvedModel;
  input: string;
}

export interface AIRuntimeTextResult {
  text: string;
  structuredOutput?: Record<string, unknown>;
  usage: AIRuntimeUsage;
  raw?: Record<string, unknown>;
}

export interface AIRuntimeImageResult {
  images: Array<{ url: string }>;
  usage: AIRuntimeUsage;
  raw?: Record<string, unknown>;
}

export interface AIRuntimeEmbeddingResult {
  embedding: number[];
  usage: AIRuntimeUsage;
  raw?: Record<string, unknown>;
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

export interface AIProviderAdapter {
  readonly provider: string;
  supports(capability: AIRuntimeCapability): boolean;
  generateText(request: AIRuntimeTextRequest): Promise<AIRuntimeTextResult>;
  generateImage(request: AIRuntimeImageRequest): Promise<AIRuntimeImageResult>;
  createEmbedding(request: AIRuntimeEmbeddingRequest): Promise<AIRuntimeEmbeddingResult>;
}
