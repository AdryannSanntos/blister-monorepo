import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { CarouselTemplateService } from '../services/carousel-template.service';
import {
  resetCarouselRunDeps,
  setCarouselRunDeps,
  type CarouselRunDeps,
} from '../ports/carousel-run-deps';
import { resolveSlidesGenerationContext } from './slides-generation-context';

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
    imageUploads: {
      'slide_2:image_url': 'file_upload_1',
    },
    settings: {
      brandName: 'Test Brand',
      instagramHandle: '@testbrand',
      accentColor: '#563BE7',
    },
  },
  previousStepsOutput: {
    generate_content: {
      slides: [
        { id: 'slide_1', order: 1, type: 'start', title: 'Capa' },
        { id: 'slide_2', order: 2, type: 'text_image', title: 'Ponto 1' },
      ],
    },
  },
} as unknown as StepExecutionContext;

const contentMachineContext = {
  ...baseContext,
  inputPayload: {
    ...baseContext.inputPayload,
    templateId: 'content-machine',
  },
  previousStepsOutput: {
    generate_content: {
      slides: [
        { id: 'slide_1', order: 1, type: 'start', narrativeRole: 'hook', title: 'Capa' },
        { id: 'slide_2', order: 2, type: 'text', narrativeRole: 'scene', title: 'Ponto 1' },
        { id: 'slide_3', order: 3, type: 'text', narrativeRole: 'cta', title: 'CTA' },
      ],
    },
  },
} as unknown as StepExecutionContext;

describe('resolveSlidesGenerationContext', () => {
  beforeEach(() => {
    setCarouselRunDeps(createMockDeps());
  });

  afterEach(() => {
    resetCarouselRunDeps();
  });

  it('reads content slides from generate_content', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.slides).toHaveLength(2);
    expect(resolved.slides[0]?.id).toBe('slide_1');
    expect(resolved.slides[1]?.type).toBe('text_image');
  });

  it('does not produce a plan for non-content-machine templates', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.plan).toBeUndefined();
    expect(resolved.templateId).toBe('editorial-performance');
  });

  it('reads image uploads from run input payload', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.imageUploads).toEqual({
      'slide_2:image_url': 'file_upload_1',
    });
  });

  it('builds a deterministic plan for content-machine template', () => {
    const resolved = resolveSlidesGenerationContext(contentMachineContext);

    expect(resolved.plan).toBeDefined();
    expect(resolved.plan?.templateId).toBe('content-machine');
    expect(resolved.plan?.slides[0]?.variationId).toBe('v1');
    expect(resolved.plan?.slides[2]?.variationId).toBe('v2');
  });

  it('ignores any legacy generate_design_plan output in previousStepsOutput', () => {
    const context = {
      ...baseContext,
      previousStepsOutput: {
        generate_content: {
          slides: [{ id: 'slide_1', order: 1, type: 'start', title: 'Capa' }],
        },
        generate_design_plan: {
          plan: {
            templateId: 'some-other-template',
            slides: [{ id: 'slide_1', variationId: 'v9' }],
          },
        },
      },
    } as unknown as StepExecutionContext;

    const resolved = resolveSlidesGenerationContext(context);

    // Non-content-machine templates get no plan — generate_design_plan output is ignored.
    expect(resolved.plan).toBeUndefined();
    expect(resolved.templateId).toBe('editorial-performance');
  });
});
