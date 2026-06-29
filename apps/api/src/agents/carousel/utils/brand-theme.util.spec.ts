import { assembleSlideCss, applyBrandThemeToCss, buildAccentCssOverride } from './brand-theme.util';

const brand = {
  brandName: 'Test',
  instagramHandle: '@test',
  accentColor: '#2563EB',
  metaRightMode: 'handle' as const,
};

describe('brand-theme.util', () => {
  it('builds accent override with derived tokens', () => {
    const css = buildAccentCssOverride('#2563EB');
    expect(css).toContain('--accent: #2563EB');
    expect(css).toContain('--section-orange-from: #2563EB');
  });

  it('places accent override after template :root so it wins cascade', () => {
    const templateCss = `:root { --accent: #ff4a0a; --section-orange-from: #f54a0a; }
.accent { color: var(--accent); }`;

    const assembled = assembleSlideCss({
      slideCss: templateCss,
      brand,
    });

    const accentIndex = assembled.lastIndexOf('--accent: #2563EB');
    const legacyIndex = assembled.indexOf('--accent: #ff4a0a');
    expect(accentIndex).toBeGreaterThan(legacyIndex);
    expect(assembled.trim().endsWith('}')).toBe(true);
  });

  it('replaces legacy hardcoded accent hex in css', () => {
    const themed = applyBrandThemeToCss(
      '.slide-cta__box { border: 2px solid #f6ddd4; color: #ff4a0a; }',
      '#2563EB',
    );
    expect(themed).not.toContain('#ff4a0a');
    expect(themed).not.toContain('#f6ddd4');
  });
});
