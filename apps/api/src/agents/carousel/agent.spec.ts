import { AgentTestHarness } from '@company-os/agent-ia-sdk/agents/testing';
import { CarouselTemplateService } from './services/carousel-template.service';
import { carouselInputZod } from './schemas/carousel-schemas';
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

  it('pauses at design approval after content is approved', async () => {
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
      ],
    };

    const harness = AgentTestHarness.forAgent(carouselAgent).withLlmResponses({
      generate_ideas: mockIdeas,
      generate_content: { slides: contentSlides },
      generate_design_plan: designPlan,
    });

    await harness.run({ ...baseInput });
    await harness.resume({ selectedIdeaId: 'idea_1' }).run();
    const result = await harness
      .resume({ contentApproved: true, slides: contentSlides })
      .run();

    expect(result.status).toBe('PAUSED');
    expect(result.pauseReason).toBe('awaiting_design_approval');
  });

  it('completes full run when all approvals are given', async () => {
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
    await harness.resume({ selectedIdeaId: 'idea_1' }).run();
    await harness.resume({ contentApproved: true, slides: contentSlides }).run();
    const result = await harness
      .resume({ designApproved: true, plan: designPlan, imageUploads: {} })
      .run();

    expect(result.status).toBe('COMPLETED');
    expect(result.output?.slides).toBeDefined();
    expect(Array.isArray(result.output?.slides)).toBe(true);
  });

  it('defines routing rules for content and design rejection', () => {
    const routing = carouselAgent.routing ?? [];
    expect(routing).toHaveLength(2);
    expect(routing[0]?.after).toBe('await_content_approval');
    expect(routing[1]?.after).toBe('await_design_approval');
  });
});
