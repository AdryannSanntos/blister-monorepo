import { AgentTestHarness } from '@company-os/agent-ia-sdk/agents/testing';
import { CarouselTemplateService } from './services/carousel-template.service';
import { carouselInputZod, carouselReviewSchema } from './schemas/carousel-schemas';
import { carouselAgent } from './agent';
import {
  resetCarouselRunDeps,
  setCarouselRunDeps,
  type CarouselRunDeps,
} from './ports/carousel-run-deps';

const baseInput = {
  theme: 'Produtividade para creators',
  templateId: 'editorial-performance',
  socialNetworks: ['instagram'],
  slidesCount: 2,
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

const createMockDeps = (): CarouselRunDeps => {
  const templateService = new CarouselTemplateService();
  return {
    templateService,
    renderSlideToPng: async () => Buffer.from('png'),
    resolveFileUrl: async () => 'https://example.com/image.png',
    storeRenderedPng: async () => 'file_mock_png',
    listOwnedTemplateIds: async () => ['editorial-performance'],
  };
};

describe('carousel agent', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps(createMockDeps());
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
      'generate_design_plan',
      'generate_slides',
      'render_slides',
      'finalize_carousel',
    ]);
  });

  it('has 7 steps total', () => {
    expect(carouselAgent.definition.steps).toHaveLength(7);
  });

  it('does not include content or design approval pause steps', () => {
    const stepKeys = carouselAgent.definition.steps.map((step) => step.key);
    expect(stepKeys).not.toContain('await_content_approval');
    expect(stepKeys).not.toContain('await_design_approval');
  });

  it('accepts slidesCount of 1 in run input', () => {
    const parsed = carouselInputZod.safeParse({
      theme: 'Single slide test',
      templateId: 'editorial-performance',
      socialNetworks: ['instagram'],
      slidesCount: 1,
      settings: {
        slidesCount: 1,
        defaultSocialNetworks: ['instagram'],
        aiGeneratedImages: false,
        accentColor: '#FF4A0A',
        metaRightMode: 'handle',
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('pauses at await_idea_selection after generating ideas', async () => {
    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
    });

    const result = await harness.run({ ...baseInput });

    expect(result.status).toBe('PAUSED');
    expect(result.pauseReason).toBe('awaiting_idea_selection');
  });

  it('runs content and design automatically after idea selection', async () => {
    const contentSlides = [
      { id: 'slide_1', order: 1, type: 'start' as const, title: '5 hábitos', body: 'Para criar mais' },
      { id: 'slide_2', order: 2, type: 'text' as const, title: 'Hábito 1', body: 'Acordar cedo' },
    ];
    const designPlan = {
      templateId: 'editorial-performance',
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'start' as const,
          variationId: 'v1',
          imageSlots: [{ slotKey: 'image_url', label: 'Foto de capa', required: true }],
          layoutNotes: 'centered',
        },
        {
          id: 'slide_2',
          order: 2,
          type: 'text' as const,
          variationId: 'v1',
          imageSlots: [],
          layoutNotes: 'left-aligned',
        },
      ],
    };

    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
      generate_content: { slides: contentSlides },
      generate_design_plan: designPlan,
      generate_slides: mockSlides,
    });

    await harness.run({ ...baseInput });
    const result = await harness.resume({ selectedIdeaId: 'idea_1' }).run();

    expect(result.status).toBe('COMPLETED');
    expect(result.output?.slides).toBeDefined();
    expect(Array.isArray(result.output?.slides)).toBe(true);
  });

  it('registers a reviewSchema on the built definition (as JSON schema)', () => {
    expect(carouselAgent.definition.reviewSchema).toBeDefined();
  });

  it('carouselReviewSchema rejects malformed edited slide output', () => {
    expect(() => carouselReviewSchema.parse({ slides: [{ id: 'x' }] })).toThrow();
  });

  it('has no routing rules for removed approval steps', () => {
    const routing = carouselAgent.routing ?? [];
    const afterKeys = routing.map((rule) => rule.after);
    expect(afterKeys).not.toContain('await_content_approval');
    expect(afterKeys).not.toContain('await_design_approval');
  });
});
