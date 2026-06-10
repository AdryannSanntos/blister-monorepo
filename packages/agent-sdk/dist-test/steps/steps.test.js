"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const index_1 = require("./index");
function createContext(overrides = {}) {
    return {
        runId: 'run_1',
        agentId: 'copywriter',
        companyId: 'company_1',
        campaignId: null,
        stepKey: 'generate_caption',
        stepIndex: 0,
        inputPayload: { userInput: 'post sobre bolo de cenoura' },
        previousStepsOutput: {},
        contextPack: { chunks: [], totalFound: 0 },
        brandProfile: null,
        ...overrides,
    };
}
(0, node_test_1.describe)('step primitives', () => {
    (0, node_test_1.it)('validates outputs with Zod', async () => {
        const step = (0, index_1.createValidationStep)({ schema: zod_1.z.object({ caption: zod_1.z.string() }) });
        const valid = await step(createContext({ previousStepsOutput: { generate_caption: { caption: 'ok' } } }), {
            llmProvider: null,
            imageProvider: null,
            assetResolver: null,
        });
        strict_1.default.equal(valid.type, 'CONTINUE');
        const invalid = await step(createContext({ previousStepsOutput: { generate_caption: { caption: 1 } } }), {
            llmProvider: null,
            imageProvider: null,
            assetResolver: null,
        });
        strict_1.default.equal(invalid.type, 'FAILED');
    });
    (0, node_test_1.it)('calls an LLM provider and validates the structured response', async () => {
        const schema = zod_1.z.object({ caption: zod_1.z.string(), hashtags: zod_1.z.array(zod_1.z.string()) });
        const step = (0, index_1.createLlmCallStep)({
            outputSchema: schema,
            buildSystem: () => 'system',
            buildUser: (ctx) => String(ctx.inputPayload.userInput),
        });
        const result = await step(createContext(), {
            imageProvider: null,
            assetResolver: null,
            llmProvider: {
                complete: async (params) => {
                    strict_1.default.equal(params.structuredOutputSchema?.type, 'object');
                    return {
                        content: JSON.stringify({ caption: 'Texto', hashtags: ['#bolo'] }),
                        model: 'stub/model',
                        tokensInput: 10,
                        tokensOutput: 5,
                        costUsd: 0.001,
                    };
                },
            },
        });
        strict_1.default.equal(result.type, 'CONTINUE');
        strict_1.default.deepEqual(result.output, { caption: 'Texto', hashtags: ['#bolo'] });
        strict_1.default.equal(result.llmModel, 'stub/model');
        strict_1.default.equal(result.creditCost, 0.001);
    });
    (0, node_test_1.it)('returns context retrieval metadata without requiring an LLM', async () => {
        const step = (0, index_1.createRetrieveContextStep)();
        const result = await step(createContext({
            contextPack: {
                totalFound: 2,
                chunks: [
                    { id: '1', content: 'marca', sourceType: 'brand', score: 0.9 },
                    { id: '2', content: 'aprendizado', sourceType: 'learning', score: 0.8 },
                ],
            },
        }), { llmProvider: null, imageProvider: null, assetResolver: null });
        strict_1.default.equal(result.type, 'CONTINUE');
        strict_1.default.equal(result.output?.contextRetrieved, true);
        strict_1.default.equal(result.output?.chunksCount, 2);
        strict_1.default.equal(result.output?.totalFound, 2);
    });
});
