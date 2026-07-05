import { summarizeVariationForPrompt } from './slide-variation-prompt.util';

describe('summarizeVariationForPrompt', () => {
  it('extracts placeholders and a compact html preview', () => {
    const summary = summarizeVariationForPrompt(
      '<div class="slide theme-dark slide-text"><h1>{{title}}</h1><p>{{body}}</p></div>',
    );

    expect(summary).toContain('rootClasses=slide theme-dark slide-text');
    expect(summary).toContain('placeholders=title, body');
    expect(summary).toContain('htmlPreview=');
  });
});
