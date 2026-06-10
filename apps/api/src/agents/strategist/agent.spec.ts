import { AgentTestHarness, assertMatchesSchema } from '@company-os/agent-sdk';
import { strategistAgent } from './agent';
import { strategistOutputZod } from './schemas/output.schema';

describe('strategist agent', () => {
  it('runs in memory and validates output schema', async () => {
    const result = await AgentTestHarness.forAgent(strategistAgent)
      .withLlmResponses({
        generate_plan: {
          topics: [
            {
              title: 'Lançamento',
              description: 'Post de divulgação do produto',
              suggestedDate: '2026-06-15',
              platform: 'instagram',
              priority: 'high',
            },
          ],
          calendar: { weeklyPosts: 3, bestTimes: ['09:00', '18:00'] },
          recommendations: 'Foque em conteúdo visual e depoimentos de clientes satisfeitos.',
        },
      })
      .run({ userInput: 'plano semanal para lançamento de bolo de cenoura' });

    expect(result.status).toBe('COMPLETED');
    assertMatchesSchema(result.output, strategistOutputZod);
  });
});
