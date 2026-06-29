import { normalizeDesignPlanSlides } from './design-plan-normalizer';

describe('design-plan-normalizer', () => {
  const baseSlides = [
    { id: 's1', order: 1, type: 'start' as const, variationId: 'v2', layoutNotes: '', imageSlots: [] },
    { id: 's2', order: 2, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    { id: 's3', order: 3, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    { id: 's4', order: 4, type: 'text' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    { id: 's5', order: 5, type: 'text' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    { id: 's6', order: 6, type: 'text' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
  ];

  const contentSlides = [
    { id: 's1', order: 1, type: 'start' as const, narrativeRole: 'hook' as const },
    { id: 's2', order: 2, type: 'text_image' as const, narrativeRole: 'scene' as const, body: 'a'.repeat(100) },
    { id: 's3', order: 3, type: 'text_image' as const, narrativeRole: 'scene' as const, body: 'b'.repeat(100) },
    { id: 's4', order: 4, type: 'text_image' as const, narrativeRole: 'proof' as const },
    { id: 's5', order: 5, type: 'text' as const, narrativeRole: 'framework' as const, listItems: ['a', 'b', 'c'] },
    { id: 's6', order: 6, type: 'text' as const, narrativeRole: 'cta' as const },
  ];

  it('forces start/v1 on first slide and text/v3 on last slide', () => {
    const normalized = normalizeDesignPlanSlides(baseSlides, contentSlides);
    expect(normalized[0]).toMatchObject({ type: 'start', variationId: 'v1' });
    expect(normalized[5]).toMatchObject({ type: 'text', variationId: 'v3' });
  });

  it('assigns framework slide to text/v1', () => {
    const normalized = normalizeDesignPlanSlides(baseSlides, contentSlides);
    expect(normalized[4]).toMatchObject({ type: 'text', variationId: 'v1' });
  });

  it('avoids repeating the same variation key on consecutive slides', () => {
    const normalized = normalizeDesignPlanSlides(baseSlides, contentSlides);
    const keys = normalized.slice(1, 5).map((slide) => `${slide.type}:${slide.variationId}`);
    for (let index = 1; index < keys.length; index += 1) {
      expect(keys[index]).not.toBe(keys[index - 1]);
    }
  });

  it('content-machine forces start/v1 and text/v2 closing', () => {
    const normalized = normalizeDesignPlanSlides(baseSlides, contentSlides, {
      templateId: 'content-machine',
    });
    expect(normalized[0]).toMatchObject({ type: 'start', variationId: 'v1' });
    expect(normalized[5]).toMatchObject({ type: 'text', variationId: 'v2' });
  });

  it('content-machine rotates image layouts without consecutive duplicates', () => {
    const imageSlides = [
      { id: 's1', order: 1, type: 'start' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's2', order: 2, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's3', order: 3, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's4', order: 4, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's5', order: 5, type: 'text' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    ];
    const imageContent = [
      { id: 's1', order: 1, type: 'start' as const, narrativeRole: 'hook' as const },
      {
        id: 's2',
        order: 2,
        type: 'text_image' as const,
        narrativeRole: 'scene' as const,
        body: 'a'.repeat(300),
        subtitle: 'Takeaway one',
        imageBrief: 'photo',
      },
      {
        id: 's3',
        order: 3,
        type: 'text_image' as const,
        narrativeRole: 'scene' as const,
        body: 'b'.repeat(300),
        subtitle: 'Takeaway two',
        imageBrief: 'photo',
      },
      {
        id: 's4',
        order: 4,
        type: 'text_image' as const,
        narrativeRole: 'proof' as const,
        body: 'c'.repeat(200),
        subtitle: 'Takeaway three',
        imageBrief: 'photo',
      },
      { id: 's5', order: 5, type: 'text' as const, narrativeRole: 'cta' as const },
    ];

    const normalized = normalizeDesignPlanSlides(imageSlides, imageContent, {
      templateId: 'content-machine',
    });

    const keys = normalized.slice(1, 4).map((slide) => `${slide.type}:${slide.variationId}`);
    expect(new Set(keys).size).toBeGreaterThan(1);
    for (let index = 1; index < keys.length; index += 1) {
      expect(keys[index]).not.toBe(keys[index - 1]);
    }
  });

  it('content-machine prefers stack layout when body2 is present', () => {
    const slides = [
      { id: 's1', order: 1, type: 'start' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's2', order: 2, type: 'text_image' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
      { id: 's3', order: 3, type: 'text' as const, variationId: 'v1', layoutNotes: '', imageSlots: [] },
    ];
    const content = [
      { id: 's1', order: 1, type: 'start' as const, narrativeRole: 'hook' as const },
      {
        id: 's2',
        order: 2,
        type: 'text_image' as const,
        narrativeRole: 'scene' as const,
        body: 'Primeiro bloco.',
        body2: 'Segundo bloco.',
        subtitle: 'Terceiro bloco.',
        imageBrief: 'photo',
      },
      { id: 's3', order: 3, type: 'text' as const, narrativeRole: 'cta' as const },
    ];

    const normalized = normalizeDesignPlanSlides(slides, content, {
      templateId: 'content-machine',
    });

    expect(normalized[1]).toMatchObject({ type: 'text_image', variationId: 'v5' });
  });
});
