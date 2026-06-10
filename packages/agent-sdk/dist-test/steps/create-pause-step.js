"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPauseStep = void 0;
const zod_to_json_schema_1 = require("../schemas/zod-to-json-schema");
const toFormSchema = (schema, pauseType) => {
    if (!schema)
        return { type: pauseType };
    return 'safeParse' in schema ? (0, zod_to_json_schema_1.zodToJsonSchema)(schema) : schema;
};
/**
 * Generic human-in-the-loop pause. Unifies approval, form collection,
 * confirmation and file upload: continues when `until` holds, otherwise emits
 * an optional preview block and pauses with a form schema.
 */
const createPauseStep = (options) => {
    return async (context, deps) => {
        if (options.until(context)) {
            return {
                type: 'CONTINUE',
                output: options.onContinue ? options.onContinue(context) : {},
            };
        }
        const formSchema = toFormSchema(options.getFormSchema?.(context), options.pauseType);
        if (deps.message) {
            if (options.previewBlock === 'formQuestion') {
                await deps.message.formQuestion(formSchema);
            }
        }
        return {
            type: 'PAUSED',
            pauseReason: options.pauseReason ?? 'Aguardando ação do usuário.',
            pauseFormSchema: formSchema,
        };
    };
};
exports.createPauseStep = createPauseStep;
