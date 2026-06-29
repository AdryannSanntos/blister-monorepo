import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { CarouselTemplateService } from '../services/carousel-template.service';
import {
  resetCarouselRunDeps,
  setCarouselRunDeps,
  type CarouselRunDeps,
} from '../ports/carousel-run-deps';
import {
  hydrateGeneratedSlides,
  normalizeGeneratedSlides,
  resolveSlideImageSlotKeys,
} from './generate-slides.step';

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

const baseContext = {
  runId: 'run_1',
  agentId: 'carousel',
  companyId: 'company_1',
  stepKey: 'generate_slides',
  inputPayload: {
    templateId: 'editorial-performance',
    socialNetworks: ['instagram'],
    settings: { brandName: 'Test Brand', instagramHandle: '@testbrand', accentColor: '#FF4A0A' },
  },
  previousStepsOutput: {
    generate_content: {
      slides: [
        { id: 'slide_1', order: 1, type: 'start', title: 'Capa', subtitle: 'Intro' },
        { id: 'slide_2', order: 2, type: 'text', title: 'Ponto 1', body: 'Detalhe' },
      ],
    },
    generate_design_plan: {
      plan: {
        templateId: 'editorial-performance',
        slides: [
          { id: 'slide_1', variationId: 'v1', layoutNotes: 'centered' },
          { id: 'slide_2', variationId: 'v1', layoutNotes: 'left' },
        ],
      },
    },
  },
} as unknown as StepExecutionContext;

describe('normalizeGeneratedSlides', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps(createMockDeps());
  });

  it('fills cssContent from template variation and keeps template html', () => {
    const normalized = normalizeGeneratedSlides(
      {
        slides: [
          {
            id: 'slide_1',
            order: 1,
            type: 'start',
            htmlContent: '<div class="slide-start"><h1>Capa</h1></div>',
          },
          {
            id: 'slide_2',
            order: 2,
            type: 'text',
            cssContent: '.slide-text { color: red; }',
          },
        ],
      },
      baseContext,
    );

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.htmlContent).toContain('{{image_url}}');
    expect(normalized[0]?.cssContent.length).toBeGreaterThan(0);
    expect(normalized[1]?.htmlContent.length).toBeGreaterThan(0);
    expect(normalized[1]?.cssContent).toContain('--accent: #FF4A0A');
    expect(normalized[1]?.cssContent.lastIndexOf('--accent: #FF4A0A')).toBeGreaterThan(0);
  });
});

describe('hydrateGeneratedSlides', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps(createMockDeps());
  });

  it('removes unresolved placeholders from template fallback html', async () => {
    const hydrated = await hydrateGeneratedSlides(
      {
        slides: [
          { id: 'slide_1', order: 1, type: 'start' },
          { id: 'slide_2', order: 2, type: 'text' },
        ],
      },
      baseContext,
    );

    expect(hydrated).toHaveLength(2);
    for (const slide of hydrated) {
      expect(slide.htmlContent).not.toMatch(/\{\{/);
    }
    expect(hydrated[0]?.htmlContent).toContain('Test Brand');
    expect(hydrated[0]?.htmlContent).toContain('1/2');
  });

  it('injects uploaded image urls from design plan slots', async () => {
    const context = {
      ...baseContext,
      inputPayload: {
        ...baseContext.inputPayload,
        imageUploads: {
          'slide_2:image_url': 'file_cover_2',
        },
      },
      previousStepsOutput: {
        ...baseContext.previousStepsOutput,
        await_design_approval: {
          imageUploads: {
            'slide_2:image_url': 'file_cover_2',
          },
          plan: {
            templateId: 'editorial-performance',
            slides: [
              {
                id: 'slide_2',
                variationId: 'v2',
                imageSlots: [{ slotKey: 'image_url', label: 'Imagem', required: true }],
              },
            ],
          },
        },
        generate_content: {
          slides: [
            { id: 'slide_1', order: 1, type: 'start', title: 'Capa', subtitle: 'Intro' },
            {
              id: 'slide_2',
              order: 2,
              type: 'text_image',
              title: 'Ponto 1',
              body: 'Detalhe',
            },
          ],
        },
        generate_design_plan: {
          plan: {
            templateId: 'editorial-performance',
            slides: [
              { id: 'slide_1', variationId: 'v1' },
              {
                id: 'slide_2',
                variationId: 'v2',
                imageSlots: [{ slotKey: 'image_url', label: 'Imagem', required: true }],
              },
            ],
          },
        },
      },
    } as unknown as StepExecutionContext;

    const deps = createMockDeps();
    deps.resolveFileUrl = async () => 'https://cdn.example.com/uploaded.jpg';
    setCarouselRunDeps(deps);

    const hydrated = await hydrateGeneratedSlides(
      {
        slides: [
          { id: 'slide_1', order: 1, type: 'start' },
          { id: 'slide_2', order: 2, type: 'text_image' },
        ],
      },
      context,
    );

    expect(hydrated[1]?.htmlContent).toContain('https://cdn.example.com/uploaded.jpg');
    expect(hydrated[1]?.htmlContent).not.toMatch(/src=""/);
  });
});

describe('resolveSlideImageSlotKeys', () => {
  it('merges slot keys from design plan even when html has no placeholders', () => {
    const keys = resolveSlideImageSlotKeys('slide_2', '<img src="" alt="" />', {
      slides: [
        {
          id: 'slide_2',
          imageSlots: [{ slotKey: 'image_url' }],
        },
      ],
    });

    expect(keys).toEqual(['image_url']);
  });
});
