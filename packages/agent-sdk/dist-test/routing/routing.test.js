"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const routing_1 = require("./routing");
const request_analysis_1 = require("../schemas/request-analysis");
const ctx = (overrides = {}) => ({
    runId: 'r',
    agentId: 'a',
    companyId: 'c',
    campaignId: null,
    stepKey: 'collect_brief',
    stepIndex: 0,
    inputPayload: {},
    previousStepsOutput: {},
    contextPack: { chunks: [], totalFound: 0 },
    brandProfile: null,
    ...overrides,
});
(0, node_test_1.describe)('routing', () => {
    (0, node_test_1.it)('skips steps of non-selected branches', () => {
        const rules = [
            {
                after: 'collect_brief',
                decide: () => 'single',
                branches: {
                    carousel: ['plan_design', 'approve_design_plan', 'generate_post'],
                    single: ['plan_design', 'generate_post'],
                },
            },
        ];
        const skips = (0, routing_1.computeRoutingSkips)(rules, 'collect_brief', ctx());
        strict_1.default.deepEqual([...skips], ['approve_design_plan']);
    });
    (0, node_test_1.it)('runs a conditional step only when the predicate holds', async () => {
        const step = (0, routing_1.createConditionalStep)({
            when: (c) => c.inputPayload.run === true,
            run: async () => ({ type: 'CONTINUE', output: { ran: true } }),
        });
        const skipped = await step(ctx({ inputPayload: { run: false } }), {
            llmProvider: null,
            imageProvider: null,
            assetResolver: null,
        });
        strict_1.default.deepEqual(skipped.output, {});
        const ran = await step(ctx({ inputPayload: { run: true } }), {
            llmProvider: null,
            imageProvider: null,
            assetResolver: null,
        });
        strict_1.default.deepEqual(ran.output, { ran: true });
    });
    (0, node_test_1.it)('maps suggestedPath and predicates to a branch', () => {
        const analysis = (0, request_analysis_1.normalizeAnalysisResult)({ suggestedPath: 'quick', extracted: {} }, []);
        strict_1.default.equal((0, routing_1.mapSuggestedPathToBranch)(analysis.suggestedPath, {
            quick: 'fast',
            full: 'complete',
            clarify: 'ask',
        }), 'fast');
        strict_1.default.equal((0, routing_1.suggestWorkflowPath)(analysis, {
            branches: [
                { id: 'never', when: () => false },
                { id: 'always', when: () => true },
            ],
        }), 'always');
    });
});
