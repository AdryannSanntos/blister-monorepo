import { z } from 'zod';

/**
 * Keys that are valid JSON Schema but break LLM "structured output" / response
 * schema validators (notably Google Gemini's `responseSchema`, which rejects
 * `$schema` and `$ref`). Stripped recursively so the derived schema is safe to
 * send to any provider.
 */
const STRIP_KEYS = new Set(['$schema', '$id', '$defs', 'definitions']);

const deepStrip = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(deepStrip);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_KEYS.has(key)) continue;
      result[key] = deepStrip(child);
    }
    return result;
  }
  return value;
};

export const zodToJsonSchema = (schema: z.ZodType): Record<string, unknown> => {
  // `reused: 'inline'` avoids `$ref`/`$defs` (Gemini can't resolve refs); the
  // deep strip removes `$schema` and any leftover definition containers.
  const json = z.toJSONSchema(schema, { reused: 'inline' }) as Record<string, unknown>;
  return deepStrip(json) as Record<string, unknown>;
};
