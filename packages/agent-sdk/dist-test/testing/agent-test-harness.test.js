"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const index_1 = require("../index");
const index_2 = require("./index");
(0, node_test_1.describe)('AgentTestHarness', () => {
    (0, node_test_1.it)('runs a built agent in memory and validates the final output schema', async () => {
        const outputSchema = zod_1.z.object({ caption: zod_1.z.string(), hashtags: zod_1.z.array(zod_1.z.string()) });
        const agent = index_1.AgentBuilder.create({ id: 'copywriter', version: '1.0.0' })
            .label('Criar texto')
            .description('Gera legendas')
            .input(zod_1.z.object({ userInput: zod_1.z.string().min(5) }))
            .output(outputSchema)
            .addStep('generate_caption', {
            label: 'Gerar legenda',
            type: 'llm_call',
            run: (0, index_1.createLlmCallStep)({
                outputSchema,
                buildSystem: () => 'system',
                buildUser: (ctx) => String(ctx.inputPayload.userInput),
            }),
        })
            .addStep('validate_output', {
            label: 'Validar saída',
            type: 'validation',
            run: (0, index_1.createValidationStep)({ schema: outputSchema }),
        })
            .build();
        const result = await index_2.AgentTestHarness.forAgent(agent)
            .withLlmResponses({
            generate_caption: { caption: 'Texto pronto', hashtags: ['#bolo'] },
        })
            .run({ userInput: 'post sobre bolo de cenoura' });
        strict_1.default.equal(result.status, 'COMPLETED');
        strict_1.default.equal(result.steps.length, 2);
        (0, index_2.assertMatchesSchema)(result.output, outputSchema);
    });
});
