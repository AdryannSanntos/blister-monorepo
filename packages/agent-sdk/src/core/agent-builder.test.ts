import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { AgentBuilder } from './index';

describe('AgentBuilder', () => {
  it('builds an agent definition and step executor map from Zod schemas', () => {
    const input = z.object({ userInput: z.string().min(5) });
    const output = z.object({ caption: z.string() });
    const step = async () => ({ type: 'CONTINUE' as const, output: { caption: 'ok' } });

    const agent = AgentBuilder.create({ id: 'copywriter', version: '1.0.0' })
      .label('Criar texto')
      .description('Gera legendas alinhadas a marca')
      .input(input)
      .output(output)
      .capabilities(['text', 'structured_output'])
      .addStep('generate_caption', {
        label: 'Gerar legenda',
        type: 'llm_call',
        run: step,
      })
      .build();

    assert.equal(agent.definition.agentId, 'copywriter');
    assert.equal(agent.definition.version, '1.0.0');
    assert.equal(agent.definition.inputSchema.type, 'object');
    assert.equal(agent.definition.steps[0].key, 'generate_caption');
    assert.equal(agent.steps.generate_caption, step);
  });

  it('rejects duplicate step keys before runtime', () => {
    const builder = AgentBuilder.create('copywriter')
      .label('Criar texto')
      .description('Gera legendas')
      .input(z.object({ userInput: z.string() }))
      .output(z.object({ caption: z.string() }))
      .addStep('generate_caption', {
        label: 'Gerar legenda',
        type: 'llm_call',
        run: async () => ({ type: 'CONTINUE' as const, output: {} }),
      });

    assert.throws(
      () =>
        builder.addStep('generate_caption', {
          label: 'Gerar legenda de novo',
          type: 'llm_call',
          run: async () => ({ type: 'CONTINUE' as const, output: {} }),
        }),
      /duplicate step/i,
    );
  });
});
