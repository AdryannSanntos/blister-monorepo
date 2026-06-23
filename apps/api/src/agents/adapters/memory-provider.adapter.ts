import type { MemoryProvider } from '@company-os/agent-ia-sdk/agents';

/**
 * Memory provider for stable user/brand preferences (distinct from learning).
 * No-op for now; back it with a RAG/preferences query when the feature lands.
 */
export const createMemoryProvider = (): MemoryProvider => ({
  recall: async () => [],
});
