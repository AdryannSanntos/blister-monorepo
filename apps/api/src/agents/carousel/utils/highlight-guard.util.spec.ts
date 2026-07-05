import { guardSlideHighlights } from './highlight-guard.util';

describe('highlight-guard.util', () => {
  it('keeps only the first highlight per block', () => {
    const result = guardSlideHighlights({
      body: '==primeiro== e depois ==segundo==',
    });

    expect(result.body).toBe('==primeiro== e depois segundo');
  });

  it('strips markers when highlight exceeds max length', () => {
    const longPhrase = 'a'.repeat(45);
    const result = guardSlideHighlights({
      body: `==${longPhrase}==`,
    });

    expect(result.body).toBe(longPhrase);
  });

  it('guards all copy fields and list items', () => {
    const result = guardSlideHighlights({
      body: '==um== e ==dois==',
      body2: '**tres** e **quatro**',
      listItems: ['==cinco== e ==seis=='],
    });

    expect(result.body).toBe('==um== e dois');
    expect(result.body2).toBe('**tres** e quatro');
    expect(result.listItems?.[0]).toBe('==cinco== e seis');
  });
});
