"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterFieldsByAnalysis = exports.shouldAskField = exports.mergeAnalysisIntoPayload = exports.normalizeAnalysisResult = exports.defineRequestAnalysisSchema = exports.baseRequestAnalysisSchema = exports.suggestedPathSchema = exports.extractedFieldSchema = void 0;
const zod_1 = require("zod");
const clarification_field_1 = require("../clarification/clarification-field");
/** Per-field extraction with the evidence and confidence the LLM reported. */
exports.extractedFieldSchema = zod_1.z.object({
    value: zod_1.z.unknown(),
    confidence: zod_1.z.enum(['high', 'medium', 'low']),
    evidence: zod_1.z.string(),
});
exports.suggestedPathSchema = zod_1.z.enum(['quick', 'full', 'clarify']);
/**
 * Base contract every agent's request analysis inherits. Agents extend it with
 * their own structured fields via {@link defineRequestAnalysisSchema}.
 */
exports.baseRequestAnalysisSchema = zod_1.z.object({
    intent: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    missingFields: zod_1.z.array(zod_1.z.string()),
    suggestedPath: exports.suggestedPathSchema,
    reasoning: zod_1.z.string(),
    extracted: zod_1.z.record(zod_1.z.string(), exports.extractedFieldSchema),
    skippedFieldNames: zod_1.z.array(zod_1.z.string()),
    enrichedBrief: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    dynamicQuestions: zod_1.z.array(clarification_field_1.clarificationFieldSchema).optional(),
});
/** Factory: build an agent-specific analysis schema on top of the base. */
const defineRequestAnalysisSchema = (extension) => exports.baseRequestAnalysisSchema.extend(extension);
exports.defineRequestAnalysisSchema = defineRequestAnalysisSchema;
const CONFIDENCE_RANK = {
    high: 3,
    medium: 2,
    low: 1,
};
/**
 * Coerces a raw LLM analysis into a consistent shape: defaults the base fields,
 * and keeps `missingFields`/`skippedFieldNames`/`extracted` in sync so callers
 * never have to reconcile them manually.
 */
const normalizeAnalysisResult = (raw, fields) => {
    const source = (raw && typeof raw === 'object' ? raw : {});
    const extracted = source.extracted && typeof source.extracted === 'object'
        ? source.extracted
        : {};
    const extractedNames = Object.keys(extracted);
    const requiredNames = fields.filter((f) => f.required !== false).map((f) => f.name);
    const missingFields = requiredNames.filter((name) => !extractedNames.includes(name));
    const skippedFieldNames = requiredNames.filter((name) => extractedNames.includes(name));
    return {
        ...source,
        intent: typeof source.intent === 'string' ? source.intent : '',
        confidence: typeof source.confidence === 'number' ? source.confidence : 0,
        reasoning: typeof source.reasoning === 'string' ? source.reasoning : '',
        suggestedPath: exports.suggestedPathSchema.safeParse(source.suggestedPath).success
            ? source.suggestedPath
            : missingFields.length === 0
                ? 'quick'
                : 'clarify',
        extracted,
        missingFields,
        skippedFieldNames,
        enrichedBrief: source.enrichedBrief && typeof source.enrichedBrief === 'object'
            ? source.enrichedBrief
            : {},
    };
};
exports.normalizeAnalysisResult = normalizeAnalysisResult;
/**
 * Merges extracted high-confidence values into the run payload so the
 * clarification step skips fields the user already answered in free text.
 */
const mergeAnalysisIntoPayload = (payload, analysis, minConfidence = 'high') => {
    const threshold = CONFIDENCE_RANK[minConfidence];
    const merged = { ...payload };
    for (const [name, field] of Object.entries(analysis.extracted)) {
        if (merged[name] !== undefined && merged[name] !== null && merged[name] !== '')
            continue;
        if (CONFIDENCE_RANK[field.confidence] >= threshold && field.value !== undefined) {
            merged[name] = field.value;
        }
    }
    return merged;
};
exports.mergeAnalysisIntoPayload = mergeAnalysisIntoPayload;
/** Whether a field still needs to be asked given the analysis and answers. */
const shouldAskField = (field, analysis, answers) => {
    if (analysis.skippedFieldNames.includes(field.name))
        return false;
    const value = answers[field.name];
    if (typeof value === 'string')
        return value.trim().length === 0;
    return value === undefined || value === null;
};
exports.shouldAskField = shouldAskField;
/** Removes fields the analysis already resolved from the pending question list. */
const filterFieldsByAnalysis = (fields, analysis) => fields.filter((field) => !analysis.skippedFieldNames.includes(field.name));
exports.filterFieldsByAnalysis = filterFieldsByAnalysis;
