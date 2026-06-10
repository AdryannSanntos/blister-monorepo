"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeUserRequest = void 0;
const parse_llm_json_1 = require("../schemas/parse-llm-json");
const request_analysis_1 = require("../schemas/request-analysis");
const zod_to_json_schema_1 = require("../schemas/zod-to-json-schema");
const analysis_prompt_1 = require("./analysis-prompt");
const EMPTY_ANALYSIS = (fields) => (0, request_analysis_1.normalizeAnalysisResult)({}, fields);
/**
 * Runs the request-analysis LLM call and returns a normalized analysis. Falls
 * back to an empty analysis (ask everything) when no LLM is available or the
 * response cannot be parsed — analysis must never crash the run.
 */
const analyzeUserRequest = async (context, deps, options) => {
    const inputKey = options.inputKey ?? 'userInput';
    const userInput = String(context.inputPayload[inputKey] ?? '').trim();
    if (!userInput || !deps.llmProvider) {
        return EMPTY_ANALYSIS(options.fields);
    }
    try {
        const response = await deps.llmProvider.complete({
            system: (0, analysis_prompt_1.buildAnalysisSystemPrompt)(context, options.fields, options.enrichments ?? []),
            user: (0, analysis_prompt_1.buildAnalysisUserPrompt)(userInput),
            structuredOutputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(options.analysisSchema),
            maxTokens: 1024,
            temperature: 0.1,
        });
        const parsed = (0, parse_llm_json_1.parseLlmJson)(response.content, request_analysis_1.baseRequestAnalysisSchema, {
            repair: (raw) => (0, request_analysis_1.normalizeAnalysisResult)(raw, options.fields),
        });
        if (parsed.success) {
            return parsed.data;
        }
        return EMPTY_ANALYSIS(options.fields);
    }
    catch {
        return EMPTY_ANALYSIS(options.fields);
    }
};
exports.analyzeUserRequest = analyzeUserRequest;
