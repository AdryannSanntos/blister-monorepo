import { normalizeCarouselSlideCopy, toCarouselPlainText } from './plain-text.util';

describe('toCarouselPlainText', () => {
  it('strips HTML tags and keeps inner text', () => {
    expect(
      toCarouselPlainText(
        'A <span class="accent">REVOLUÇÃO DA IA</span> JÁ ACONTECEU',
      ),
    ).toBe('A REVOLUÇÃO DA IA JÁ ACONTECEU');
  });

  it('preserves line breaks between headline lines', () => {
    expect(toCarouselPlainText('Linha 1\nLinha 2')).toBe('Linha 1\nLinha 2');
  });

  it('returns undefined for empty strings after cleanup', () => {
    expect(toCarouselPlainText('<span></span>')).toBeUndefined();
  });
});

describe('normalizeCarouselSlideCopy', () => {
  it('sanitizes all copy fields on a slide', () => {
    expect(
      normalizeCarouselSlideCopy({
        id: 'slide_1',
        order: 1,
        type: 'start',
        title: '<strong>Título</strong>',
        body: 'Texto <em>rico</em>',
        callToAction: '<span>Salvar</span>',
      }),
    ).toEqual({
      id: 'slide_1',
      order: 1,
      type: 'start',
      title: 'Título',
      body: 'Texto rico',
      callToAction: 'Salvar',
    });
  });
});
