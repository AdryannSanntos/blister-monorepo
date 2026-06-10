"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToJsonSchema = void 0;
const zod_1 = require("zod");
/**
 * Keys that are valid JSON Schema but break LLM "structured output" / response
 * schema validators (notably Google Gemini's `responseSchema`, which rejects
 * `$schema` and `$ref`). Stripped recursively so the derived schema is safe to
 * send to any provider.
 */
const STRIP_KEYS = new Set(['$schema', '$id', '$defs', 'definitions']);
const deepStrip = (value) => {
    if (Array.isArray(value)) {
        return value.map(deepStrip);
    }
    if (value && typeof value === 'object') {
        const result = {};
        for (const [key, child] of Object.entries(value)) {
            if (STRIP_KEYS.has(key))
                continue;
            result[key] = deepStrip(child);
        }
        return result;
    }
    return value;
};
const zodToJsonSchema = (schema) => {
    // `reused: 'inline'` avoids `$ref`/`$defs` (Gemini can't resolve refs); the
    // deep strip removes `$schema` and any leftover definition containers.
    const json = zod_1.z.toJSONSchema(schema, { reused: 'inline' });
    return deepStrip(json);
};
exports.zodToJsonSchema = zodToJsonSchema;
