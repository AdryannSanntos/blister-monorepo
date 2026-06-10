"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFormAnswer = exports.enrichmentFieldZod = exports.stepMetadataZod = void 0;
const zod_1 = require("zod");
/** Step metadata carried alongside a StepResult (tokens, model, cost). */
exports.stepMetadataZod = zod_1.z.object({
    llmModel: zod_1.z.string().optional(),
    tokensInput: zod_1.z.number().optional(),
    tokensOutput: zod_1.z.number().optional(),
    creditCost: zod_1.z.number().optional(),
});
/** Definition of an enriched (non-form) brief field extracted by analysis. */
exports.enrichmentFieldZod = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
});
/**
 * Validates a single answer against the field that asked for it. `single`
 * answers must match one of the option ids; `multi` must be a subset; `text`
 * must be a non-empty string when required.
 */
const validateFormAnswer = (field, value) => {
    const optionIds = (field.options ?? []).map((option) => option.id);
    let schema;
    switch (field.kind) {
        case 'single':
            schema = optionIds.length > 0 ? zod_1.z.enum(optionIds) : zod_1.z.string();
            break;
        case 'multi':
            schema =
                optionIds.length > 0
                    ? zod_1.z.array(zod_1.z.enum(optionIds))
                    : zod_1.z.array(zod_1.z.string());
            break;
        default:
            schema = field.required === false ? zod_1.z.string() : zod_1.z.string().min(1);
            break;
    }
    return schema.safeParse(value);
};
exports.validateFormAnswer = validateFormAnswer;
