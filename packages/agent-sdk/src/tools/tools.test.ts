import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import type { StepExecutionContext } from '../core/types';
import { LearningSerializerRegistry } from '../learning/learning-registry';
import { ToolRegistry } from './tool-registry';
import { createToolStep } from './create-tool-step';

const ctx = (): StepExecutionContext => ({
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

describe('createToolStep', () => {
  it('runs the LLM → tool → LLM loop and returns the validated final answer', async () => {
    const registry = new ToolRegistry().register({
      name: 'getPrice',
      description: 'Consulta o preço de um produto',
      inputSchema: z.object({ product: z.string() }),
      execute: async ({ product }) => ({ product, price: 42 }),
    });

    const responses = [
      JSON.stringify({ tool: 'getPrice', arguments: { product: 'bolo' } }),
      JSON.stringify({ final: true, answer: { reply: 'O bolo custa R$42' } }),
    ];
    let call = 0;

    const step = createToolStep({
      registry,
      outputSchema: z.object({ reply: z.string() }),
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

    assert.equal(result.type, 'CONTINUE');
    assert.deepEqual(result.output, { reply: 'O bolo custa R$42' });
  });
});

describe('LearningSerializerRegistry', () => {
  it('registers and serializes per agent', () => {
    LearningSerializerRegistry.clear();
    LearningSerializerRegistry.register<{ approved: boolean }, { ok: boolean }>('demo', {
      serialize: (f) => `approved=${f.approved}`,
      extractInsights: (f) => ({ ok: f.approved }),
    });

    assert.equal(LearningSerializerRegistry.has('demo'), true);
    assert.equal(LearningSerializerRegistry.serialize('demo', { approved: true }), 'approved=true');
    assert.deepEqual(LearningSerializerRegistry.extractInsights('demo', { approved: true }), {
      ok: true,
    });
    assert.equal(LearningSerializerRegistry.serialize('missing', {}), null);
  });
});
