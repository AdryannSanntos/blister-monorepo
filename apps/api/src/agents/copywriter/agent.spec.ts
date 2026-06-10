import { AgentTestHarness, assertMatchesSchema } from '@company-os/agent-sdk';
import { copywriterAgent } from './agent';
import { copywriterOutputZod } from './schemas/output.schema';

describe('copywriter agent', () => {
  it('runs in memory and validates output schema', async () => {
    const result = await AgentTestHarness.forAgent(copywriterAgent)
      .withLlmResponses({
        generate_caption: {
          caption: 'Descubra o sabor irresistível do nosso bolo de cenoura!',
          hashtags: ['#bolo', '#cenoura', '#doces'],
          tone: 'enthusiastic',
        },
      })
      .run({ userInput: 'post sobre lançamento do bolo de cenoura' });

    expect(result.status).toBe('COMPLETED');
    assertMatchesSchema(result.output, copywriterOutputZod);
  });
});
