export interface NormalizerRules {
  /** Maps alias keys to the canonical key (e.g. { copy: 'caption' }). */
  aliases?: Record<string, string>;
  /** Maps enum aliases per field (e.g. { tone: { animado: 'enthusiastic' } }). */
  enumAliases?: Record<string, Record<string, string>>;
  /** Arbitrary repair applied after alias/enum normalization. */
  repair?: (raw: Record<string, unknown>) => Record<string, unknown>;
}

const applyAliases = (
  raw: Record<string, unknown>,
  aliases: Record<string, string>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...raw };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (result[alias] !== undefined && result[canonical] === undefined) {
      result[canonical] = result[alias];
      delete result[alias];
    }
  }
  return result;
};

const applyEnumAliases = (
  raw: Record<string, unknown>,
  enumAliases: Record<string, Record<string, string>>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...raw };
  for (const [field, map] of Object.entries(enumAliases)) {
    const value = result[field];
    if (typeof value === 'string' && map[value] !== undefined) {
      result[field] = map[value];
    }
  }
  return result;
};

/**
 * Builds a pre-parse normalizer that rewrites PT/EN aliases and invalid enum
 * values before a schema's `safeParse`. Use it as the `repair` hook of
 * {@link parseLlmJson} or standalone.
 */
export const createNormalizer = (rules: NormalizerRules) => {
  return (raw: unknown): unknown => {
    if (!raw || typeof raw !== 'object') return raw;
    let result = raw as Record<string, unknown>;
    if (rules.aliases) result = applyAliases(result, rules.aliases);
    if (rules.enumAliases) result = applyEnumAliases(result, rules.enumAliases);
    if (rules.repair) result = rules.repair(result);
    return result;
  };
};
