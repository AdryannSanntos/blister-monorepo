import { normalizeCarouselSlideCopy, toCarouselPlainText } from './plain-text.util';

describe('toCarouselPlainText', () => {
  it('converts accent spans back to == markers before stripping html', () => {
    expect(
      toCarouselPlainText(
        'A <span class="accent">REVOLUÇÃO DA IA</span> JÁ ACONTECEU',
      ),
    ).toBe('A ==REVOLUÇÃO DA IA== JÁ ACONTECEU');
  });

  it('converts strong tags to ** markers', () => {
    expect(toCarouselPlainText('Texto <strong>importante</strong> aqui')).toBe(
      'Texto **importante** aqui',
    );
  });

  it('preserves existing == markers', () => {
    expect(toCarouselPlainText('CANNABIS ==LEGAL== NO BRASIL')).toBe(
      'CANNABIS ==LEGAL== NO BRASIL',
    );
  });

  it('preserves line breaks between headline lines', () => {
    expect(toCarouselPlainText('Linha 1\nLinha 2')).toBe('Linha 1\nLinha 2');
  });

  it('returns undefined for empty strings after cleanup', () => {
    expect(toCarouselPlainText('<span></span>')).toBeUndefined();
  });
});

describe('normalizeCarouselSlideCopy', () => {
  it('preserves highlight markers when sanitizing copy fields', () => {
    expect(
      normalizeCarouselSlideCopy({
        id: 'slide_1',
        order: 1,
        type: 'start',
        title: '<span class="accent">CANNABIS</span> NO BRASIL',
        body: 'Texto <em>rico</em>',
        callToAction: '<span>Salvar</span>',
      }),
    ).toEqual({
      id: 'slide_1',
      order: 1,
      type: 'start',
      title: '==CANNABIS== NO BRASIL',
      body: 'Texto rico',
      callToAction: 'Salvar',
    });
  });

  it('ignores null optional copy fields', () => {
    expect(
      normalizeCarouselSlideCopy({
        id: 'slide_2',
        order: 2,
        type: 'text',
        body2: null as unknown as string,
      }),
    ).toEqual({
      id: 'slide_2',
      order: 2,
      type: 'text',
    });
  });
});
