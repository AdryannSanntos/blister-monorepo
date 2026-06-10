"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const learning_registry_1 = require("../learning/learning-registry");
const tool_registry_1 = require("./tool-registry");
const create_tool_step_1 = require("./create-tool-step");
const ctx = () => ({
    runId: 'r',
    agentId: 'a',
    companyId: 'c',
    campaignId: null,
    stepKey: 'tool_step',
    stepIndex: 0,
    inputPayload: { userInput: 'preço do bolo' },
    previousStepsOutput: {},
    contextPack: { chunks: [], totalFound: 0 },
    brandProfile: null,
});
(0, node_test_1.describe)('createToolStep', () => {
    (0, node_test_1.it)('runs the LLM → tool → LLM loop and returns the validated final answer', async () => {
        const registry = new tool_registry_1.ToolRegistry().register({
            name: 'getPrice',
            description: 'Consulta o preço de um produto',
            inputSchema: zod_1.z.object({ product: zod_1.z.string() }),
            execute: async ({ product }) => ({ product, price: 42 }),
        });
        const responses = [
            JSON.stringify({ tool: 'getPrice', arguments: { product: 'bolo' } }),
            JSON.stringify({ final: true, answer: { reply: 'O bolo custa R$42' } }),
        ];
        let call = 0;
        const step = (0, create_tool_step_1.createToolStep)({
            registry,
            outputSchema: zod_1.z.object({ reply: zod_1.z.string() }),
            buildSystem: () => 'system',
            buildUser: () => 'qual o preço?',
        });
        const result = await step(ctx(), {
            assetResolver: null,
            imageProvider: null,
            llmProvider: {
                complete: async () => ({
                    content: responses[call++],
                    model: 'stub',
                    tokensInput: 1,
                    tokensOutput: 1,
                    costUsd: 0.001,
                }),
            },
        });
        strict_1.default.equal(result.type, 'CONTINUE');
        strict_1.default.deepEqual(result.output, { reply: 'O bolo custa R$42' });
    });
});
(0, node_test_1.describe)('LearningSerializerRegistry', () => {
    (0, node_test_1.it)('registers and serializes per agent', () => {
        learning_registry_1.LearningSerializerRegistry.clear();
        learning_registry_1.LearningSerializerRegistry.register('demo', {
            serialize: (f) => `approved=${f.approved}`,
            extractInsights: (f) => ({ ok: f.approved }),
        });
        strict_1.default.equal(learning_registry_1.LearningSerializerRegistry.has('demo'), true);
        strict_1.default.equal(learning_registry_1.LearningSerializerRegistry.serialize('demo', { approved: true }), 'approved=true');
        strict_1.default.deepEqual(learning_registry_1.LearningSerializerRegistry.extractInsights('demo', { approved: true }), {
            ok: true,
        });
        strict_1.default.equal(learning_registry_1.LearningSerializerRegistry.serialize('missing', {}), null);
    });
});
