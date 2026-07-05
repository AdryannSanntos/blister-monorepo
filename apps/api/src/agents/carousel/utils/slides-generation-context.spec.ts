import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { resolveSlidesGenerationContext } from './slides-generation-context';

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

describe('resolveSlidesGenerationContext', () => {
  it('reads content slides from generate_content', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.slides).toHaveLength(2);
    expect(resolved.slides[0]?.id).toBe('slide_1');
    expect(resolved.slides[1]?.type).toBe('text_image');
  });

  it('reads design plan from generate_design_plan', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.plan?.templateId).toBe('editorial-performance');
    expect(resolved.plan?.slides[1]?.variationId).toBe('v2');
  });

  it('reads image uploads from run input payload', () => {
    const resolved = resolveSlidesGenerationContext(baseContext);

    expect(resolved.imageUploads).toEqual({
      'slide_2:image_url': 'file_upload_1',
    });
  });

  it('does not read legacy await_design_approval output', () => {
    const context = {
      ...baseContext,
      previousStepsOutput: {
        generate_content: {
          slides: [{ id: 'slide_1', order: 1, type: 'start', title: 'Capa' }],
        },
        generate_design_plan: {
          plan: {
            templateId: 'editorial-performance',
            slides: [{ id: 'slide_1', variationId: 'v1' }],
          },
        },
        await_design_approval: {
          plan: {
            templateId: 'minimal-clean',
            slides: [{ id: 'slide_1', variationId: 'v9' }],
          },
          imageUploads: { 'slide_1:image_url': 'legacy_file' },
        },
      },
    } as unknown as StepExecutionContext;

    const resolved = resolveSlidesGenerationContext(context);

    expect(resolved.plan?.templateId).toBe('editorial-performance');
    expect(resolved.plan?.slides[0]?.variationId).toBe('v1');
    expect(resolved.imageUploads).toEqual({
      'slide_2:image_url': 'file_upload_1',
    });
  });
});
