import { normalizeContentSlides } from './content-slides-normalizer';

describe('content-slides-normalizer', () => {
  it('forces start and cta types on first and last slides', () => {
    const normalized = normalizeContentSlides([
      { id: 's1', order: 1, type: 'text', narrativeRole: 'hook' },
      { id: 's2', order: 2, type: 'text', narrativeRole: 'scene', body: 'Scene copy' },
      { id: 's3', order: 3, type: 'text_image', narrativeRole: 'cta', ctaKeyword: 'SALVE' },
    ]);

    expect(normalized[0]?.type).toBe('start');
    expect(normalized[2]?.type).toBe('text');
  });

  it('mixes text-only and text_image middle slides when scenes lack image brief', () => {
    const normalized = normalizeContentSlides([
      { id: 's1', order: 1, type: 'start', narrativeRole: 'hook' },
      { id: 's2', order: 2, type: 'text_image', narrativeRole: 'scene', title: 'A', body: 'B' },
      { id: 's3', order: 3, type: 'text_image', narrativeRole: 'scene', title: 'C', body: 'D' },
      { id: 's4', order: 4, type: 'text', narrativeRole: 'cta', ctaKeyword: 'GO' },
    ]);

    const middleTypes = normalized.slice(1, 3).map((slide) => slide.type);
    expect(middleTypes).toContain('text');
    expect(middleTypes).toContain('text_image');
  });
});
