/** A chat message in provider-neutral form. */
export interface TextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Token accounting returned by a text completion. */
export interface TextUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** An inline image attached to the user turn (for vision-capable models). */
export interface TextImageInput {
  mimeType: string;
  base64: string;
}

export interface TextCompleteParams {
  messages: TextMessage[];
  /** External (provider-native) model id, e.g. `anthropic/claude-sonnet-4`. */
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** When set, the provider is asked to return JSON matching this schema. */
  structuredOutputSchema?: Record<string, unknown>;
  /**
   * Images attached to the last user message (vision input). Adapters that
   * support vision translate these to their multimodal format; others ignore
   * them. Used by `ia/rag` captioning.
   */
  images?: TextImageInput[];
}

export interface TextResult {
  content: string;
  structuredOutput?: Record<string, unknown>;
  usage: TextUsage;
  finishReason: string;
}

/** One streamed delta. `isLast` marks the terminal (empty) sentinel chunk. */
export interface TextChunk {
  content: string;
  isLast: boolean;
}

/**
 * Text generation capability. Adapters (OpenRouter, Gemini, …) implement this;
 * `agents/` and `ia/rag/caption` depend only on this interface, never on a
 * concrete adapter.
 *
 * `stream` is an `AsyncGenerator` so callers can both iterate deltas and read
 * the final `TextResult` (with usage) from the generator's return value.
 */
export interface ITextProvider {
  readonly provider: string;
  complete(params: TextCompleteParams): Promise<TextResult>;
  stream(params: TextCompleteParams): AsyncGenerator<TextChunk, TextResult>;
}
