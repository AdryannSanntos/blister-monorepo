"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const zod_1 = require("zod");
const agent_builder_1 = require("../core/agent-builder");
const steps_1 = require("../steps");
const adaptive_brief_1 = require("../intelligence/adaptive-brief");
const request_analysis_1 = require("../schemas/request-analysis");
const agent_test_harness_1 = require("./agent-test-harness");
const to_match_schema_1 = require("./matchers/to-match-schema");
const outputZod = zod_1.z.object({ caption: zod_1.z.string() });
const buildClarifyingAgent = () => agent_builder_1.AgentBuilder.create({ id: 'flow_clarify', version: '1.0.0' })
    .label('Flow')
    .input(zod_1.z.object({ userInput: zod_1.z.string() }))
    .output(outputZod)
    .addStep('collect_brief', {
    label: 'Brief',
    type: 'clarification',
    run: (0, steps_1.createClarificationStep)({
        fields: [
            {
                name: 'tone',
                kind: 'single',
                label: 'Qual o tom?',
                required: true,
                options: [{ id: 'fun', label: 'Divertido' }],
            },
        ],
        buildBrief: (answers) => ({ tone: answers.tone }),
    }),
})
    .addStep('generate', {
    label: 'Gerar',
    type: 'llm_call',
    run: (0, steps_1.createLlmCallStep)({
        outputSchema: outputZod,
        buildSystem: () => 'system',
        buildUser: () => 'user',
    }),
})
    .addStep('validate', {
    label: 'Validar',
    type: 'validation',
    run: (0, steps_1.createValidationStep)({ schema: outputZod, sourceStepKeys: ['generate'] }),
})
    .build();
(0, node_test_1.describe)('AgentTestHarness pause/resume', () => {
    (0, node_test_1.it)('pauses on a missing field then resumes to completion', async () => {
        const harness = agent_test_harness_1.AgentTestHarness.forAgent(buildClarifyingAgent()).withLlmResponses({
            generate: { caption: 'Bolo de cenoura irresistível!' },
        });
        const paused = await harness.runUntilPaused({ userInput: 'post sobre bolo' });
        strict_1.default.equal(paused.status, 'PAUSED');
        strict_1.default.equal(paused.pauseReason, 'Qual o tom?');
        const completed = await harness.resume({ tone: 'fun' }).run();
        strict_1.default.equal(completed.status, 'COMPLETED');
        (0, to_match_schema_1.assertMatchesSchema)(completed.output, outputZod);
        strict_1.default.ok(completed.usage.length > 0, 'usage events captured');
        strict_1.default.ok(completed.blocks.length > 0, 'blocks captured');
    });
});
(0, node_test_1.describe)('createAdaptiveBriefStep', () => {
    const analysisSchema = (0, request_analysis_1.defineRequestAnalysisSchema)({
        tone: zod_1.z.enum(['fun', 'serious']).optional(),
    });
    const buildAdaptiveAgent = () => agent_builder_1.AgentBuilder.create({ id: 'flow_adaptive', version: '1.0.0' })
        .label('Flow')
        .input(zod_1.z.object({ userInput: zod_1.z.string() }))
        .output(outputZod)
        .addStep('collect_brief', {
        label: 'Brief',
        type: 'clarification',
        run: (0, adaptive_brief_1.createAdaptiveBriefStep)({
            analysisSchema,
            fields: [
                {
                    name: 'tone',
                    kind: 'single',
                    label: 'Qual o tom?',
                    required: true,
                    options: [
                        { id: 'fun', label: 'Divertido' },
                        { id: 'serious', label: 'Sério' },
                    ],
                },
            ],
            buildBrief: (answers) => ({ tone: answers.tone }),
        }),
    })
        .addStep('generate', {
        label: 'Gerar',
        type: 'llm_call',
        run: (0, steps_1.createLlmCallStep)({
            outputSchema: outputZod,
            buildSystem: () => 'system',
            buildUser: () => 'user',
        }),
    })
        .build();
    (0, node_test_1.it)('skips a field already answered in free text and completes without pausing', async () => {
        const harness = agent_test_harness_1.AgentTestHarness.forAgent(buildAdaptiveAgent()).withLlmResponses({
            collect_brief: {
                intent: 'post divertido',
                confidence: 0.95,
                reasoning: 'tom divertido explícito',
                suggestedPath: 'quick',
                extracted: { tone: { value: 'fun', confidence: 'high', evidence: 'tom divertido' } },
                missingFields: [],
                skippedFieldNames: ['tone'],
                enrichedBrief: {},
            },
            generate: { caption: 'Texto divertido!' },
        });
        const result = await harness.run({ userInput: 'quero um post bem divertido' });
        strict_1.default.equal(result.status, 'COMPLETED');
        (0, to_match_schema_1.assertMatchesSchema)(result.output, outputZod);
    });
    (0, node_test_1.it)('pauses when the required field cannot be extracted', async () => {
        const harness = agent_test_harness_1.AgentTestHarness.forAgent(buildAdaptiveAgent()).withLlmResponses({
            collect_brief: {
                intent: 'post',
                confidence: 0.4,
                reasoning: 'tom não informado',
                suggestedPath: 'clarify',
                extracted: {},
                missingFields: ['tone'],
                skippedFieldNames: [],
                enrichedBrief: {},
            },
        });
        const paused = await harness.runUntilPaused({ userInput: 'quero um post' });
        strict_1.default.equal(paused.status, 'PAUSED');
        strict_1.default.equal(paused.pauseReason, 'Qual o tom?');
    });
});
