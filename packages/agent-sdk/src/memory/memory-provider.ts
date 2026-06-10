/**
 * Long-lived user/brand preferences distinct from learning.
 *
 * - learning = "the user approved X output" (feedback indexed in RAG)
 * - memory   = "the user prefers short CTAs" (stable preference recalled later)
 *
 * The interface can start as a no-op and be backed by RAG/preferences later.
 */
export interface MemoryChunk {
  id: string;
  content: string;
  kind: string;
  score?: number;
}

export interface MemoryContext {
  companyId: string;
  agentId: string;
  campaignId?: string | null;
}

export interface MemoryProvider {
  recall?(query: string, context: MemoryContext): Promise<MemoryChunk[]>;
}

/** Memory provider that recalls nothing — valid default until RAG is wired. */
export const createNoOpMemoryProvider = (): MemoryProvider => ({
  recall: async () => [],
});
