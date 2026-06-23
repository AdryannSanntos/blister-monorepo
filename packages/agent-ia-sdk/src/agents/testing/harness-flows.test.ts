import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { AgentBuilder } from '../core/agent-builder';
import {
  createClarificationStep,
  createLlmCallStep,
  createValidationStep,
} from '../steps';
import { createAdaptiveBriefStep } from '../intelligence/adaptive-brief';
import { defineRequestAnalysisSchema } from '../schemas/request-analysis';
import { AgentTestHarness } from './agent-test-harness';
import { assertMatchesSchema } from './matchers/to-match-schema';

const outputZod = z.object({ caption: z.string() });

const buildClarifyingAgent = () =>
  AgentBuilder.create({ id: 'flow_clarify', version: '1.0.0' })
    .label('Flow')
    .input(z.object({ userInput: z.string() }))
    .output(outputZod)
    .addStep('collect_brief', {
      label: 'Brief',
      type: 'clarification',
      run: createClarificationStep({
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
      run: createLlmCallStep({
        outputSchema: outputZod,
        buildSystem: () => 'system',
        buildUser: () => 'user',
      }),
    })
    .addStep('validate', {
      label: 'Validar',
      type: 'validation',
      run: createValidationStep({ schema: outputZod, sourceStepKeys: ['generate'] }),
    })
    .build();

describe('AgentTestHarness pause/resume', () => {
  it('pauses on a missing field then resumes to completion', async () => {
    const harness = AgentTestHarness.forAgent(buildClarifyingAgent()).withLlmResponses({
      generate: { caption: 'Bolo de cenoura irresistível!' },
    });

    const paused = await harness.runUntilPaused({ userInput: 'post sobre bolo' });
    assert.equal(paused.status, 'PAUSED');
    assert.equal(paused.pauseReason, 'Qual o tom?');

    const completed = await harness.resume({ tone: 'fun' }).run();
    assert.equal(completed.status, 'COMPLETED');
    assertMatchesSchema(completed.output, outputZod);
    assert.ok(completed.usage.length > 0, 'usage events captured');
    assert.ok(completed.blocks.length > 0, 'blocks captured');
  });
});

describe('createAdaptiveBriefStep', () => {
  const analysisSchema = defineRequestAnalysisSchema({
    tone: z.enum(['fun', 'serious']).optional(),
  });

  const buildAdaptiveAgent = () =>
    AgentBuilder.create({ id: 'flow_adaptive', version: '1.0.0' })
      .label('Flow')
      .input(z.object({ userInput: z.string() }))
      .output(outputZod)
      .addStep('collect_brief', {
        label: 'Brief',
        type: 'clarification',
        run: createAdaptiveBriefStep({
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
        run: createLlmCallStep({
          outputSchema: outputZod,
          buildSystem: () => 'system',
          buildUser: () => 'user',
        }),
      })
      .build();

  it('skips a field already answered in free text and completes without pausing', async () => {
    const harness = AgentTestHarness.forAgent(buildAdaptiveAgent()).withLlmResponses({
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
    assert.equal(result.status, 'COMPLETED');
    assertMatchesSchema(result.output, outputZod);
  });

  it('pauses when the required field cannot be extracted', async () => {
    const harness = AgentTestHarness.forAgent(buildAdaptiveAgent()).withLlmResponses({
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
    assert.equal(paused.status, 'PAUSED');
    assert.equal(paused.pauseReason, 'Qual o tom?');
  });
});
