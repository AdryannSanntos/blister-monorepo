import type { StepExecutionContext } from '../core/types';

/** Pluggable cache for LLM step outputs. Implemented by the app if desired. */
export interface CacheProvider {
  get(key: string): Promise<Record<string, unknown> | null>;
  set(key: string, value: Record<string, unknown>): Promise<void>;
}

export type RetryReason = 'parse_error' | 'rate_limit' | 'provider_error';

export interface RetryPolicy {
  maxAttempts: number;
  backoff?: 'none' | 'exponential';
  retryOn?: RetryReason[];
  /** Base delay in ms for exponential backoff (default 0 — test friendly). */
  baseDelayMs?: number;
}

export interface CacheConfig {
  provider: CacheProvider;
  cacheKey: (context: StepExecutionContext) => string;
}

export const sleep = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** In-memory cache provider for tests. */
export const createInMemoryCacheProvider = (): CacheProvider & { store: Map<string, Record<string, unknown>> } => {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => {
      store.set(key, value);
    },
  };
};
