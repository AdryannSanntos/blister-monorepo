import { buildRegisteredAgents } from './agent-catalog';

describe('buildRegisteredAgents', () => {
  it('registers a reviewSchema for the carousel agent that rejects malformed edited output', () => {
    const carousel = buildRegisteredAgents().find((agent) => agent.agentId === 'carousel');

    expect(carousel?.reviewSchema).toBeDefined();
    expect(() => carousel!.reviewSchema!.parse({ slides: [{ id: 'x' }] })).toThrow();
  });

  it('accepts well-formed edited slides for the carousel agent', () => {
    const carousel = buildRegisteredAgents().find((agent) => agent.agentId === 'carousel');

    const result = carousel!.reviewSchema!.safeParse({
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'start',
          htmlContent: '<div class="slide"></div>',
          cssContent: '.slide{width:1080px;height:1080px}',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
