"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clarificationFieldSchema = exports.clarificationOptionZod = exports.clarificationFieldKindZod = void 0;
const zod_1 = require("zod");
/**
 * Canonical clarification field contract shared by every agent that collects a
 * brief before running the LLM. Agents emit one field per pause; the resolver
 * decides what to ask next based on the answers accumulated so far.
 */
exports.clarificationFieldKindZod = zod_1.z.enum(['single', 'multi', 'text']);
exports.clarificationOptionZod = zod_1.z.object({
    id: zod_1.z.string(),
    label: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
exports.clarificationFieldSchema = zod_1.z.object({
    name: zod_1.z.string(),
    kind: exports.clarificationFieldKindZod,
    label: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    options: zod_1.z.array(exports.clarificationOptionZod).optional(),
    placeholder: zod_1.z.string().optional(),
    required: zod_1.z.boolean().optional(),
    /** When present, the field is only asked if the predicate holds. */
    dependsOn: zod_1.z
        .object({
        field: zod_1.z.string(),
        equals: zod_1.z.unknown(),
    })
        .optional(),
});
