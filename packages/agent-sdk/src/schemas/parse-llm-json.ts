import type { z } from 'zod';

export type ParseLlmJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error?: string; raw?: unknown };

export interface ParseLlmJsonOptions {
  /** How many times to attempt parse+repair before giving up (default 1). */
  maxAttempts?: number;
  /** Repair raw parsed value before validation (alias mapping, enum fixes). */
  repair?: (raw: unknown) => unknown;
  /** Called between attempts with the validation error. */
  onRetry?: (attempt: number, error: z.ZodError) => void;
}

const stripFences = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const extractJson = (raw: string): unknown => {
  const normalized = stripFences(raw);
  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(normalized.slice(start, end + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
};

/**
 * Resilient JSON parse for LLM output: strips markdown fences, extracts the
 * first balanced object, optionally repairs the value, then validates against
 * a Zod schema. Returns the typed data on success or the raw value on failure.
 */
export const parseLlmJson = <T extends z.ZodType>(
  raw: string,
  schema: T,
  options?: ParseLlmJsonOptions,
): ParseLlmJsonResult<z.infer<T>> => {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 1);
  const parsed = extractJson(raw);

  if (parsed === undefined) {
    return { success: false, error: 'Invalid JSON', raw };
  }

  let candidate: unknown = parsed;
  let lastError: z.ZodError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options?.repair && attempt > 1) {
      candidate = options.repair(candidate);
    } else if (options?.repair && attempt === 1) {
      candidate = options.repair(candidate);
    }

    const result = schema.safeParse(candidate);
    if (result.success) {
      return { success: true, data: result.data };
    }

    lastError = result.error;
    if (attempt < maxAttempts) {
      options?.onRetry?.(attempt, result.error);
    }
  }

  return {
    success: false,
    error: lastError ? lastError.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') : 'Schema validation failed',
    raw: candidate,
  };
};
