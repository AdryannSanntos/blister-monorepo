"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyzeRequestStep = exports.createAdaptiveBriefStep = void 0;
const clarification_flow_1 = require("../clarification/clarification-flow");
const request_analysis_1 = require("../schemas/request-analysis");
const analyze_request_1 = require("./analyze-request");
const toOutput = (brief, analysis) => {
    const base = brief && typeof brief === 'object' ? brief : { brief };
    return { ...base, enrichedBrief: analysis.enrichedBrief };
};
/**
 * Analyzes the free-text request, merges high-confidence answers into the
 * payload, then asks only the fields still missing (one pause per field).
 * Once the brief is complete it builds the typed brief and continues.
 */
const createAdaptiveBriefStep = (options) => {
    return async (context, deps) => {
        const analysis = await (0, analyze_request_1.analyzeUserRequest)(context, deps, {
            analysisSchema: options.analysisSchema,
            fields: options.fields,
            enrichments: options.enrichments,
            inputKey: options.inputKey,
        });
        if (options.emitThinkingBlock && analysis.reasoning && deps.message) {
            const thinking = deps.message.thinking();
            thinking.delta(analysis.reasoning);
            await thinking.end();
        }
        const merged = (0, request_analysis_1.mergeAnalysisIntoPayload)(context.inputPayload, analysis, options.minConfidenceToSkip ?? 'high');
        const next = options.getNextField
            ? options.getNextField(merged, analysis)
            : (0, clarification_flow_1.getNextField)(merged, options.fields);
        if (next) {
            const pauseFormSchema = { fields: [next] };
            await deps.message?.formQuestion(pauseFormSchema);
            return {
                type: 'PAUSED',
                pauseReason: next.label,
                pauseFormSchema,
            };
        }
        const brief = options.buildBrief(merged, analysis);
        return {
            type: 'CONTINUE',
            output: toOutput(brief, analysis),
        };
    };
};
exports.createAdaptiveBriefStep = createAdaptiveBriefStep;
/**
 * Standalone analysis step: extracts structured fields from the free-text
 * request and returns the analysis without pausing. Useful when analysis and
 * clarification are separate steps.
 */
const createAnalyzeRequestStep = (options) => {
    return async (context, deps) => {
        const analysis = await (0, analyze_request_1.analyzeUserRequest)(context, deps, options);
        const relevantFields = (0, clarification_flow_1.resolveConditionalFields)(context.inputPayload, options.fields);
        return {
            type: 'CONTINUE',
            output: {
                analysis,
                missingFields: analysis.missingFields,
                relevantFieldNames: relevantFields.map((f) => f.name),
            },
        };
    };
};
exports.createAnalyzeRequestStep = createAnalyzeRequestStep;
