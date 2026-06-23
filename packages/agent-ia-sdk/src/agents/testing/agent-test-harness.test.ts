import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { AgentBuilder, createLlmCallStep, createValidationStep } from '../index';
import { AgentTestHarness, assertMatchesSchema } from './index';

describe('AgentTestHarness', () => {
  it('runs a built agent in memory and validates the final output schema', async () => {
    const outputSchema = z.object({ caption: z.string(), hashtags: z.array(z.string()) });
    const agent = AgentBuilder.create({ id: 'copywriter', version: '1.0.0' })
      .label('Criar texto')
      .description('Gera legendas')
      .input(z.object({ userInput: z.string().min(5) }))
      .output(outputSchema)
      .addStep('generate_caption', {
        label: 'Gerar legenda',
        type: 'llm_call',
        run: createLlmCallStep({
          outputSchema,
          buildSystem: () => 'system',
          buildUser: (ctx) => String(ctx.inputPayload.userInput),
        }),
      })
      .addStep('validate_output', {
        label: 'Validar saída',
        type: 'validation',
        run: createValidationStep({ schema: outputSchema }),
      })
      .build();

    const result = await AgentTestHarness.forAgent(agent)
      .withLlmResponses({
        generate_caption: { caption: 'Texto pronto', hashtags: ['#bolo'] },
      })
      .run({ userInput: 'post sobre bolo de cenoura' });

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.steps.length, 2);
    assertMatchesSchema(result.output, outputSchema);
  });
});
