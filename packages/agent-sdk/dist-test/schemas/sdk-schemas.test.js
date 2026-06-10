"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const normalizer_1 = require("./normalizer");
const parse_llm_json_1 = require("./parse-llm-json");
const request_analysis_1 = require("./request-analysis");
const clarification_answer_1 = require("./clarification-answer");
(0, node_test_1.describe)('parseLlmJson', () => {
    const schema = zod_1.z.object({ caption: zod_1.z.string() });
    (0, node_test_1.it)('strips fences and extracts the object', () => {
        const result = (0, parse_llm_json_1.parseLlmJson)('```json\n{"caption":"oi"}\n```', schema);
        strict_1.default.equal(result.success, true);
        if (result.success)
            strict_1.default.equal(result.data.caption, 'oi');
    });
    (0, node_test_1.it)('repairs aliases before validating', () => {
        const repair = (0, normalizer_1.createNormalizer)({ aliases: { copy: 'caption' } });
        const result = (0, parse_llm_json_1.parseLlmJson)('{"copy":"texto"}', schema, { repair });
        strict_1.default.equal(result.success, true);
        if (result.success)
            strict_1.default.equal(result.data.caption, 'texto');
    });
    (0, node_test_1.it)('returns the raw value on failure', () => {
        const result = (0, parse_llm_json_1.parseLlmJson)('not json', schema);
        strict_1.default.equal(result.success, false);
    });
});
(0, node_test_1.describe)('request analysis', () => {
    (0, node_test_1.it)('keeps missing/skipped fields in sync', () => {
        const analysis = (0, request_analysis_1.normalizeAnalysisResult)({ extracted: { tone: { value: 'fun', confidence: 'high', evidence: 'x' } } }, [
            { name: 'tone', kind: 'single', label: 'Tom', required: true },
            { name: 'format', kind: 'single', label: 'Formato', required: true },
        ]);
        strict_1.default.deepEqual(analysis.skippedFieldNames, ['tone']);
        strict_1.default.deepEqual(analysis.missingFields, ['format']);
    });
    (0, node_test_1.it)('merges only high-confidence values not already answered', () => {
        const analysis = (0, request_analysis_1.normalizeAnalysisResult)({
            extracted: {
                tone: { value: 'fun', confidence: 'high', evidence: 'x' },
                format: { value: 'single', confidence: 'low', evidence: 'y' },
            },
        }, []);
        const merged = (0, request_analysis_1.mergeAnalysisIntoPayload)({}, analysis, 'high');
        strict_1.default.equal(merged.tone, 'fun');
        strict_1.default.equal(merged.format, undefined);
    });
});
(0, node_test_1.describe)('validateFormAnswer', () => {
    (0, node_test_1.it)('accepts a valid option and rejects an invalid one', () => {
        const field = {
            name: 'tone',
            kind: 'single',
            label: 'Tom',
            options: [{ id: 'fun', label: 'Divertido' }],
        };
        strict_1.default.equal((0, clarification_answer_1.validateFormAnswer)(field, 'fun').success, true);
        strict_1.default.equal((0, clarification_answer_1.validateFormAnswer)(field, 'nope').success, false);
    });
});
