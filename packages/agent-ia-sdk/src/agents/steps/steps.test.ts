import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import type { StepExecutionContext } from '../core';
import { createLlmCallStep, createRetrieveContextStep, createValidationStep } from './index';

function createContext(overrides: Partial<StepExecutionContext> = {}): StepExecutionContext {
  return {
    runId: 'run_1',
    agentId: 'copywriter',
    companyId: 'company_1',
    stepKey: 'generate_caption',
    stepIndex: 0,
    inputPayload: { userInput: 'post sobre bolo de cenoura' },
    previousStepsOutput: {},
    ...overrides,
  };
}

describe('step primitives', () => {
  it('validates outputs with Zod', async () => {
    const step = createValidationStep({ schema: z.object({ caption: z.string() }) });

    const valid = await step(
      createContext({ previousStepsOutput: { generate_caption: { caption: 'ok' } } }),
      {
        llmProvider: null,
        imageProvider: null,
      },
    );
    assert.equal(valid.type, 'CONTINUE');

    const invalid = await step(
      createContext({ previousStepsOutput: { generate_caption: { caption: 1 } } }),
      {
        llmProvider: null,
        imageProvider: null,
      },
    );
    assert.equal(invalid.type, 'FAILED');
  });

  it('calls an LLM provider and validates the structured response', async () => {
    const schema = z.object({ caption: z.string(), hashtags: z.array(z.string()) });
    const step = createLlmCallStep({
      outputSchema: schema,
      buildSystem: () => 'system',
      buildUser: (ctx) => String(ctx.inputPayload.userInput),
    });

    const result = await step(createContext(), {
      imageProvider: null,
      llmProvider: {
        complete: async (params) => {
          assert.equal(params.structuredOutputSchema?.type, 'object');
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

    assert.equal(result.type, 'CONTINUE');
    assert.deepEqual(result.output, { caption: 'Texto', hashtags: ['#bolo'] });
    assert.equal(result.llmModel, 'stub/model');
    assert.equal(result.creditCost, 0.001);
  });

  it('retries when transformOutput throws (e.g. semantic validation failure), then succeeds', async () => {
    const schema = z.object({ caption: z.string() });
    let calls = 0;
    const step = createLlmCallStep({
      outputSchema: schema,
      buildSystem: () => 'system',
      buildUser: () => 'user',
      retry: { maxAttempts: 2, retryOn: ['parse_error'] },
      transformOutput: (data) => {
        calls += 1;
        if (calls === 1) {
          throw new Error('Content generation returned 1 slide(s) but 5 were requested');
        }
        return { caption: data.caption };
      },
    });

    const result = await step(createContext(), {
      imageProvider: null,
      llmProvider: {
        complete: async () => ({
          content: JSON.stringify({ caption: 'Texto' }),
          model: 'stub/model',
          tokensInput: 10,
          tokensOutput: 5,
          costUsd: 0.001,
        }),
      },
    });

    assert.equal(calls, 2);
    assert.equal(result.type, 'CONTINUE');
    assert.deepEqual(result.output, { caption: 'Texto' });
  });

  it('fails after exhausting retries when transformOutput keeps throwing', async () => {
    const schema = z.object({ caption: z.string() });
    const step = createLlmCallStep({
      outputSchema: schema,
      buildSystem: () => 'system',
      buildUser: () => 'user',
      retry: { maxAttempts: 2, retryOn: ['parse_error'] },
      transformOutput: () => {
        throw new Error('Content generation returned 1 slide(s) but 5 were requested');
      },
    });

    const result = await step(createContext(), {
      imageProvider: null,
      llmProvider: {
        complete: async () => ({
          content: JSON.stringify({ caption: 'Texto' }),
          model: 'stub/model',
          tokensInput: 10,
          tokensOutput: 5,
          costUsd: 0.001,
        }),
      },
    });

    assert.equal(result.type, 'FAILED');
    assert.match(result.error ?? '', /5 were requested/);
  });

  it('returns context retrieval metadata without requiring an LLM', async () => {
    const step = createRetrieveContextStep();
    const result = await step(createContext(), {
      llmProvider: null,
      imageProvider: null,
    });

    assert.equal(result.type, 'CONTINUE');
    assert.equal(result.output?.contextRetrieved, false);
    assert.equal(result.output?.chunksCount, 0);
  });
});
