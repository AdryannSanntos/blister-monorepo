import { AgentTestHarness } from '@company-os/agent-ia-sdk/agents/testing';
import { carouselAgent } from './agent';
import {
  resetCarouselRunDeps,
  setCarouselRunDeps,
} from './ports/carousel-run-deps';

const baseInput = {
  theme: 'Produtividade para creators',
  templateId: 'minimal-clean',
  socialNetworks: ['instagram'],
  slidesCount: 5,
};

const mockIdeas = {
  ideas: [
    {
      id: 'idea_1',
      title: '5 hábitos que dobram sua produção',
      description: 'Lista de hábitos simples para criar mais conteúdo',
    },
    {
      id: 'idea_2',
      title: 'Como planejar uma semana de conteúdo',
      description: 'Estratégia de planejamento semanal',
    },
  ],
};

const mockSlides = {
  slides: [
    {
      id: 'slide_1',
      order: 1,
      type: 'start' as const,
      htmlContent: '<div class="slide slide-start"><h1>5 hábitos</h1></div>',
      cssContent: '.slide{width:1080px;height:1080px}',
    },
    {
      id: 'slide_2',
      order: 2,
      type: 'text' as const,
      htmlContent: '<div class="slide slide-text"><h2>Hábito 1</h2></div>',
      cssContent: '.slide{width:1080px;height:1080px}',
    },
  ],
};

describe('carousel agent', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps({});
  });

  it('has the correct agent id', () => {
    expect(carouselAgent.definition.agentId).toBe('carousel');
  });

  it('has the correct label', () => {
    expect(carouselAgent.definition.label).toBe('Carrossel');
  });

  it('has the expected steps in order', () => {
    const stepKeys = carouselAgent.definition.steps.map((step) => step.key);
    expect(stepKeys).toEqual([
      'generate_ideas',
      'await_idea_selection',
      'generate_content',
      'await_content_approval',
      'generate_design_plan',
      'await_design_approval',
      'generate_slides',
      'render_slides',
      'finalize_carousel',
    ]);
  });

  it('has 9 steps total', () => {
    expect(carouselAgent.definition.steps).toHaveLength(9);
  });

  it('pauses at await_idea_selection after generating ideas', async () => {
    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
    });

    const result = await harness.run({ ...baseInput });

    expect(result.status).toBe('PAUSED');
    expect(result.pauseReason).toBe('awaiting_idea_selection');
  });

  it('continues past idea selection with selectedIdeaId', async () => {
    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
      generate_content: {
        slides: [
          { id: 'slide_1', order: 1, type: 'start', title: '5 hábitos', body: 'Para criar mais' },
          { id: 'slide_2', order: 2, type: 'text', title: 'Hábito 1', body: 'Acordar cedo' },
        ],
      },
    });

    await harness.run({ ...baseInput });

    const resumed = await harness
      .resume({ selectedIdeaId: 'idea_1' })
      .run();

    expect(resumed.status).toBe('PAUSED');
    expect(resumed.pauseReason).toBe('awaiting_content_approval');
  });

  it('completes full run when all approvals are given', async () => {
    const contentSlides = [
      { id: 'slide_1', order: 1, type: 'start' as const, title: '5 hábitos', body: 'Para criar mais' },
      { id: 'slide_2', order: 2, type: 'text' as const, title: 'Hábito 1', body: 'Acordar cedo' },
    ];
    const designPlan = {
      templateId: 'minimal-clean',
      slides: [
        { id: 'slide_1', order: 1, type: 'start' as const, variationId: 'v1', needsImage: false, layoutNotes: 'centered' },
        { id: 'slide_2', order: 2, type: 'text' as const, variationId: 'v1', needsImage: false, layoutNotes: 'left-aligned' },
      ],
    };

    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
      generate_content: { slides: contentSlides },
      generate_design_plan: designPlan,
      generate_slides: mockSlides,
    });

    // Initial run — pauses at idea selection
    await harness.run({ ...baseInput });

    // Resume with idea selection — pauses at content approval
    await harness.resume({ selectedIdeaId: 'idea_1' }).run();

    // Approve content — pauses at design approval
    await harness.resume({ approved: true, slides: contentSlides }).run();

    // Approve design — pauses at design approval (should now complete)
    const result = await harness.resume({ approved: true, plan: designPlan, imageUploads: {} }).run();

    expect(result.status).toBe('COMPLETED');
    expect(result.output?.slides).toBeDefined();
    expect(Array.isArray(result.output?.slides)).toBe(true);
  });
});
