import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import {
  alignSlidesToContent,
  enforceContentSlidesCount,
  resolveContentSlidesFromContext,
  resolveExpectedSlidesCount,
} from './slide-count-alignment.util';

describe('slide-count-alignment.util', () => {
  const context = {
    inputPayload: {
      slidesCount: 5,
      settings: { slidesCount: 3 },
    },
    previousStepsOutput: {
      generate_content: {
        slides: [
          { id: 'slide_1', order: 1, type: 'start' },
          { id: 'slide_2', order: 2, type: 'text' },
          { id: 'slide_3', order: 3, type: 'text_image' },
        ],
      },
    },
  } as unknown as StepExecutionContext;

  it('prefers top-level slidesCount over settings', () => {
    expect(resolveExpectedSlidesCount(context)).toBe(5);
  });

  it('reads content slides from generate_content', () => {
    expect(resolveContentSlidesFromContext(context)).toHaveLength(3);
  });

  it('ignores legacy await_content_approval output', () => {
    const legacyContext = {
      ...context,
      previousStepsOutput: {
        generate_content: {
          slides: [{ id: 'slide_1', order: 1, type: 'start' }],
        },
        await_content_approval: {
          slides: [
            { id: 'slide_1', order: 1, type: 'start' },
            { id: 'slide_2', order: 2, type: 'text' },
          ],
        },
      },
    } as unknown as StepExecutionContext;

    expect(resolveContentSlidesFromContext(legacyContext)).toHaveLength(1);
    expect(resolveContentSlidesFromContext(legacyContext)[0]?.id).toBe('slide_1');
  });

  it('aligns llm slides to full content slide list', () => {
    const aligned = alignSlidesToContent(
      [
        { id: 'slide_1', order: 1, type: 'start' },
        { id: 'slide_2', order: 2, type: 'text' },
        { id: 'slide_3', order: 3, type: 'text_image' },
      ],
      [{ id: 'slide_1', order: 1, type: 'start', variationId: 'v1' }],
      (slide) => ({
        variationId: slide.type === 'start' ? 'v1' : 'v2',
        layoutNotes: '',
      }),
    );

    expect(aligned).toHaveLength(3);
    expect(aligned[0]?.variationId).toBe('v1');
    expect(aligned[1]?.variationId).toBe('v2');
    expect(aligned[2]?.variationId).toBe('v2');
  });

  it('throws when content generation under-delivers slides', () => {
    expect(() =>
      enforceContentSlidesCount([{ id: 'slide_1', order: 1, type: 'start' }], 5),
    ).toThrow('returned 1 slide(s) but 5 were requested');
  });

  it('trims extra slides to the requested count', () => {
    const result = enforceContentSlidesCount(
      [
        { id: 'slide_1', order: 1, type: 'start' },
        { id: 'slide_2', order: 2, type: 'text' },
        { id: 'slide_3', order: 3, type: 'text' },
      ],
      2,
    );

    expect(result).toHaveLength(2);
    expect(result.map((slide) => slide.id)).toEqual(['slide_1', 'slide_2']);
  });
});
