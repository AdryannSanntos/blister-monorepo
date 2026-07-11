import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { buildSlidesUserPrompt } from '../prompts/slides.prompts';
import { CarouselTemplateService } from '../services/carousel-template.service';
import { resetCarouselRunDeps, setCarouselRunDeps } from '../ports/carousel-run-deps';

const createMockDeps = () => ({
  templateService: new CarouselTemplateService(),
  renderSlideToPng: async () => Buffer.from('png'),
  resolveFileUrl: async () => 'https://example.com/image.png',
  storeRenderedPng: async () => 'file_mock_png',
  listOwnedTemplateIds: async () => ['content-machine', 'editorial-performance'],
});

const makeContext = (templateId: string, slideCount: number): StepExecutionContext => {
  const slides = Array.from({ length: slideCount }, (_, i) => ({
    id: `slide_${i + 1}`,
    order: i + 1,
    type: i === 0 ? 'start' : i === slideCount - 1 ? 'text' : 'text_image',
    title: `Title ${i + 1}`,
    body: 'Body text with some content that could be longer in real runs.',
    body2: 'Second body block for narrative depth.',
    subtitle: 'Support line',
  }));

  const variationIds = ['v1', 'bottom-accent', 'center-white', 'start-dark', 'text/v1'];

  return {
    runId: 'run_1',
    agentId: 'carousel',
    companyId: 'company_1',
    stepKey: 'generate_slides',
    inputPayload: {
      templateId,
      settings: { brandName: 'Test Brand', instagramHandle: '@testbrand', accentColor: '#563be7' },
    },
    previousStepsOutput: {
      generate_content: { slides },
    },
  } as unknown as StepExecutionContext;
};

describe('buildSlidesUserPrompt size', () => {
  beforeEach(() => {
    resetCarouselRunDeps();
    setCarouselRunDeps(createMockDeps());
  });

  it('keeps editorial-performance prompts under 40KB for 10 slides', () => {
    for (const count of [8, 10]) {
      const prompt = buildSlidesUserPrompt(makeContext('editorial-performance', count));
      expect(prompt.length).toBeLessThan(40_000);
    }
  });

  it('keeps content-machine prompts compact', () => {
    const prompt = buildSlidesUserPrompt(makeContext('content-machine', 10));
    expect(prompt.length).toBeLessThan(25_000);
  });
});
