import { AgentTestHarness, assertMatchesSchema } from '@company-os/agent-sdk';
import { designerAgent } from './agent';
import { designerOutputZod } from './schemas/output.schema';

describe('designer agent', () => {
  it('runs in memory and validates output schema', async () => {
    const result = await AgentTestHarness.forAgent(designerAgent)
      .withLlmResponses({
        generate_prompt: {
          imagePrompt: 'A professional food photo of carrot cake on a rustic wooden table',
          style: 'rustic',
          colors: ['#8B4513', '#FF8C00'],
        },
      })
      .run({ userInput: 'imagem para post de lançamento de bolo de cenoura' });

    expect(result.status).toBe('COMPLETED');
    assertMatchesSchema(result.output, designerOutputZod);
  });
});
