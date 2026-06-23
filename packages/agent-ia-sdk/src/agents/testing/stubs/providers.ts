import type { LlmProviderRuntime, UsageReporter as CreditReporter } from '../../core/agent-runtime-types';
import type { EventPublisher, RunEventPayload } from '../../stream';
import type { ImageProvider, LlmProvider } from '../../core/types';

export type LlmResponseMap = Record<string, unknown>;

const toCompletion = (response: unknown) => ({
  content: typeof response === 'string' ? response : JSON.stringify(response ?? {}),
  model: 'stub/model',
  tokensInput: 10,
  tokensOutput: 5,
  costUsd: 0.001,
});

/** SDK-shaped ({system,user}) LLM provider returning a fixed canned response. */
export const createStubLlmProvider = (response: unknown): LlmProvider => ({
  complete: async () => toCompletion(response),
  completeStream: async (_params, onChunk) => {
    const completion = toCompletion(response);
    onChunk(completion.content);
    return completion;
  },
});

/** Runtime-shaped (messages[]) LLM provider, used for the kernel generic path. */
export const createStubLlmProviderRuntime = (response: unknown): LlmProviderRuntime => ({
  complete: async () => toCompletion(response),
});

export const createStubImageProvider = (options?: {
  imageUrl?: string;
  base64?: string;
  storageKey?: string;
}): ImageProvider => ({
  generate: async () => ({
    imageUrl: options?.imageUrl ?? 'https://example.com/generated-image.png',
    base64: options?.base64,
    storageKey: options?.storageKey ?? 'stub/generated-image.png',
  }),
});

export interface CollectingEventPublisher extends EventPublisher {
  events: RunEventPayload[];
}

export const createCollectingEventPublisher = (): CollectingEventPublisher => {
  const events: RunEventPayload[] = [];
  return {
    events,
    publish: async (event) => {
      events.push(event);
    },
  };
};

export const createNoOpEventPublisher = (): EventPublisher => ({
  publish: async () => {},
});

/** Billing reporter stub: always succeeds, debiting the base cost as-is. */
export const createStubCreditReporter = (): CreditReporter => ({
  getPlatformSettings: async () => ({ markupDefault: 1, minRunCost: 0 }),
  debitStep: async (params) => ({
    success: true,
    debitedAmount: params.baseCost,
    newBalance: 1000,
  }),
});
