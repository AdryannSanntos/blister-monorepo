import { resolveCarouselBrandContext, normalizeInstagramHandle, buildAccentCssOverride } from './carousel-brand.util';

describe('carousel-brand.util', () => {
  it('normalizes instagram handle with @ prefix', () => {
    expect(normalizeInstagramHandle('creator')).toBe('@creator');
    expect(normalizeInstagramHandle('@creator')).toBe('@creator');
  });

  it('resolves brand context from overrides and settings', () => {
    const brand = resolveCarouselBrandContext({
      brandOverrides: { brandName: 'Run Brand', instagramHandle: 'run' },
      agentSettings: {
        brandName: 'Settings Brand',
        instagramHandle: 'settings',
        accentColor: '#112233',
      },
    });

    expect(brand.brandName).toBe('Run Brand');
    expect(brand.instagramHandle).toBe('@run');
    expect(brand.accentColor).toBe('#112233');
  });

  it('builds accent css override', () => {
    expect(buildAccentCssOverride('#FF4A0A')).toContain('--accent: #FF4A0A');
  });
});
