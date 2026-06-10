"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const index_1 = require("./index");
(0, node_test_1.describe)('AgentBuilder', () => {
    (0, node_test_1.it)('builds an agent definition and step executor map from Zod schemas', () => {
        const input = zod_1.z.object({ userInput: zod_1.z.string().min(5) });
        const output = zod_1.z.object({ caption: zod_1.z.string() });
        const step = async () => ({ type: 'CONTINUE', output: { caption: 'ok' } });
        const agent = index_1.AgentBuilder.create({ id: 'copywriter', version: '1.0.0' })
            .label('Criar texto')
            .description('Gera legendas alinhadas a marca')
            .input(input)
            .output(output)
            .capabilities(['text', 'structured_output'])
            .withContext({ includeBrandBrain: true, includeAgentLearning: true })
            .addStep('generate_caption', {
            label: 'Gerar legenda',
            type: 'llm_call',
            run: step,
        })
            .build();
        strict_1.default.equal(agent.definition.agentId, 'copywriter');
        strict_1.default.equal(agent.definition.version, '1.0.0');
        strict_1.default.equal(agent.definition.inputSchema.type, 'object');
        strict_1.default.equal(agent.definition.steps[0].key, 'generate_caption');
        strict_1.default.equal(agent.steps.generate_caption, step);
    });
    (0, node_test_1.it)('rejects duplicate step keys before runtime', () => {
        const builder = index_1.AgentBuilder.create('copywriter')
            .label('Criar texto')
            .description('Gera legendas')
            .input(zod_1.z.object({ userInput: zod_1.z.string() }))
            .output(zod_1.z.object({ caption: zod_1.z.string() }))
            .addStep('generate_caption', {
            label: 'Gerar legenda',
            type: 'llm_call',
            run: async () => ({ type: 'CONTINUE', output: {} }),
        });
        strict_1.default.throws(() => builder.addStep('generate_caption', {
            label: 'Gerar legenda de novo',
            type: 'llm_call',
            run: async () => ({ type: 'CONTINUE', output: {} }),
        }), /duplicate step/i);
    });
});
