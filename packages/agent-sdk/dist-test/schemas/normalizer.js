"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNormalizer = void 0;
const applyAliases = (raw, aliases) => {
    const result = { ...raw };
    for (const [alias, canonical] of Object.entries(aliases)) {
        if (result[alias] !== undefined && result[canonical] === undefined) {
            result[canonical] = result[alias];
            delete result[alias];
        }
    }
    return result;
};
const applyEnumAliases = (raw, enumAliases) => {
    const result = { ...raw };
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
const createNormalizer = (rules) => {
    return (raw) => {
        if (!raw || typeof raw !== 'object')
            return raw;
        let result = raw;
        if (rules.aliases)
            result = applyAliases(result, rules.aliases);
        if (rules.enumAliases)
            result = applyEnumAliases(result, rules.enumAliases);
        if (rules.repair)
            result = rules.repair(result);
        return result;
    };
};
exports.createNormalizer = createNormalizer;
