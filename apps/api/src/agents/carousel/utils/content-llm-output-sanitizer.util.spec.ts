import { sanitizeContentLlmOutput } from './content-llm-output-sanitizer.util';

describe('content-llm-output-sanitizer.util', () => {
  it('removes null string fields from slide copy', () => {
    const result = sanitizeContentLlmOutput({
      slides: [
        {
          id: 'slide_1',
          order: 1,
          type: 'text',
          body: 'Primeiro bloco.',
          body2: null,
          subtitle: null,
        },
      ],
    }) as { slides: Array<Record<string, unknown>> };

    expect(result.slides[0]).toEqual({
      id: 'slide_1',
      order: 1,
      type: 'text',
      body: 'Primeiro bloco.',
    });
  });

  it('drops invalid slide entries', () => {
    const result = sanitizeContentLlmOutput({
      slides: [null, { id: 'slide_2', order: 2, type: 'text', body: 'ok' }],
    }) as { slides: Array<Record<string, unknown>> };

    expect(result.slides).toHaveLength(1);
    expect(result.slides[0]?.id).toBe('slide_2');
  });
});
