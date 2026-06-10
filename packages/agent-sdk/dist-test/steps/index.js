"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetrieveContextStep = exports.createOutputStep = exports.createClarificationStep = exports.createLlmCallStep = exports.createValidationStep = exports.createInMemoryCacheProvider = exports.createPauseStep = exports.createImageGenerationStep = void 0;
const clarification_flow_1 = require("../clarification/clarification-flow");
const parse_llm_json_1 = require("../schemas/parse-llm-json");
const validate_step_output_1 = require("../schemas/validate-step-output");
const zod_to_json_schema_1 = require("../schemas/zod-to-json-schema");
const cache_1 = require("./cache");
var create_image_generation_step_1 = require("./create-image-generation-step");
Object.defineProperty(exports, "createImageGenerationStep", { enumerable: true, get: function () { return create_image_generation_step_1.createImageGenerationStep; } });
var create_pause_step_1 = require("./create-pause-step");
Object.defineProperty(exports, "createPauseStep", { enumerable: true, get: function () { return create_pause_step_1.createPauseStep; } });
var cache_2 = require("./cache");
Object.defineProperty(exports, "createInMemoryCacheProvider", { enumerable: true, get: function () { return cache_2.createInMemoryCacheProvider; } });
const mergePreviousOutputs = (previousStepsOutput, sourceStepKeys) => {
    const merged = {};
    const entries = sourceStepKeys
        ? sourceStepKeys
            .map((key) => previousStepsOutput[key])
            .filter((output) => Boolean(output))
        : Object.values(previousStepsOutput);
    for (const output of entries) {
        Object.assign(merged, output);
    }
    return merged;
};
const createValidationStep = (options) => {
    return async (context) => {
        const mergedOutput = mergePreviousOutputs(context.previousStepsOutput, options.sourceStepKeys);
        const validated = (0, validate_step_output_1.validateStepOutput)(options.schema, mergedOutput);
        if (!validated.success) {
            return {
                type: 'FAILED',
                error: 'Step output validation failed',
            };
        }
        return {
            type: 'CONTINUE',
            output: validated.data,
        };
    };
};
exports.createValidationStep = createValidationStep;
const isRateLimitError = (error) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('rate limit') || message.includes('429') || message.includes('too many requests');
};
const createLlmCallStep = (options) => {
    const retry = options.retry ?? { maxAttempts: 1 };
    const retryOn = retry.retryOn ?? ['parse_error', 'rate_limit', 'provider_error'];
    return async (context, deps) => {
        if (!deps.llmProvider) {
            return {
                type: 'FAILED',
                error: 'LLM provider is required for llm_call steps',
            };
        }
        const cacheKey = options.cache?.cacheKey(context);
        if (options.cache && cacheKey) {
            const cached = await options.cache.provider.get(cacheKey);
            if (cached) {
                return { type: 'CONTINUE', output: cached };
            }
        }
        const llmParams = {
            system: options.buildSystem(context),
            user: options.buildUser(context),
            structuredOutputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(options.outputSchema),
            maxTokens: options.maxTokens,
            temperature: options.temperature,
        };
        let lastError = 'LLM response failed schema validation';
        for (let attempt = 1; attempt <= Math.max(1, retry.maxAttempts); attempt += 1) {
            let response;
            try {
                response = await deps.llmProvider.complete(llmParams);
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : 'Provider error';
                const reason = isRateLimitError(error) ? 'rate_limit' : 'provider_error';
                if (attempt < retry.maxAttempts && retryOn.includes(reason)) {
                    await (0, cache_1.sleep)(retry.backoff === 'exponential' ? (retry.baseDelayMs ?? 0) * 2 ** (attempt - 1) : 0);
                    continue;
                }
                return { type: 'FAILED', error: lastError };
            }
            const parsed = (0, parse_llm_json_1.parseLlmJson)(response.content, options.outputSchema, {
                repair: options.repair,
            });
            if (parsed.success) {
                const output = options.transformOutput
                    ? options.transformOutput(parsed.data, context)
                    : parsed.data;
                if (options.cache && cacheKey) {
                    await options.cache.provider.set(cacheKey, output);
                }
                return {
                    type: 'CONTINUE',
                    output,
                    llmModel: response.model,
                    tokensInput: response.tokensInput,
                    tokensOutput: response.tokensOutput,
                    creditCost: response.costUsd,
                };
            }
            lastError = parsed.error ?? lastError;
            if (attempt < retry.maxAttempts && retryOn.includes('parse_error')) {
                await (0, cache_1.sleep)(retry.backoff === 'exponential' ? (retry.baseDelayMs ?? 0) * 2 ** (attempt - 1) : 0);
                continue;
            }
            return { type: 'FAILED', error: lastError };
        }
        return { type: 'FAILED', error: lastError };
    };
};
exports.createLlmCallStep = createLlmCallStep;
/**
 * Human-in-the-loop brief collection without LLM analysis: asks the next
 * missing field (one pause per field), then builds the typed brief.
 */
const createClarificationStep = (options) => {
    return async (context, deps) => {
        const answers = context.inputPayload;
        const next = (0, clarification_flow_1.getNextField)(answers, options.fields);
        if (next) {
            const pauseFormSchema = { fields: [next] };
            await deps.message?.formQuestion(pauseFormSchema);
            return { type: 'PAUSED', pauseReason: next.label, pauseFormSchema };
        }
        const brief = options.buildBrief(answers);
        const output = brief && typeof brief === 'object'
            ? brief
            : { brief };
        return { type: 'CONTINUE', output };
    };
};
exports.createClarificationStep = createClarificationStep;
/** Final step that returns the merged outputs of all previous steps. */
const createOutputStep = () => {
    return async (context) => {
        const merged = {};
        for (const output of Object.values(context.previousStepsOutput)) {
            Object.assign(merged, output);
        }
        return { type: 'CONTINUE', output: merged };
    };
};
exports.createOutputStep = createOutputStep;
const createRetrieveContextStep = (options) => {
    return async (context, deps) => {
        const { contextPack, brandProfile } = context;
        const emitSearching = options?.emitSearching ?? false;
        if (emitSearching && deps.message) {
            const results = contextPack.chunks.slice(0, 5).map((chunk, index) => ({
                title: typeof chunk.metadata?.title === 'string' ? chunk.metadata.title : `Contexto ${index + 1}`,
                source: chunk.sourceType,
                date: '',
            }));
            await deps.message.searching({ resultsCount: contextPack.chunks.length, results }, options?.searchingLabel ?? 'Consultando o Cérebro da Marca');
        }
        const brandChunks = contextPack.chunks.filter((c) => c.sourceType === 'BRAND_BRAIN');
        const learningChunks = contextPack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
        const campaignChunks = contextPack.chunks.filter((c) => ['CAMPAIGN', 'CAMPAIGN_FILE'].includes(c.sourceType));
        return {
            type: 'CONTINUE',
            output: {
                contextRetrieved: true,
                chunksCount: contextPack.chunks.length,
                totalFound: contextPack.totalFound,
                totalChunks: contextPack.chunks.length,
                brandChunksCount: brandChunks.length,
                learningChunksCount: learningChunks.length,
                campaignChunksCount: campaignChunks.length,
                hasBrandContext: brandChunks.length > 0 || brandProfile !== null,
                hasLearningContext: learningChunks.length > 0,
                hasCampaignContext: campaignChunks.length > 0,
                brandProfileAvailable: brandProfile !== null,
            },
        };
    };
};
exports.createRetrieveContextStep = createRetrieveContextStep;
