import { isRetryable } from './errors';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export type RetryOnTransientOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

/**
 * Retries an async operation when the thrown error is a transient provider
 * failure (HTTP 429 or 5xx wrapped as ProviderExecutionError).
 */
export const retryOnTransient = async <T>(
  fn: () => Promise<T>,
  options?: RetryOnTransientOptions,
): Promise<T> => {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
  const baseDelayMs = options?.baseDelayMs ?? 1_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt >= maxAttempts) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
};
