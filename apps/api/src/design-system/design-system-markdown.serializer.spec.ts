import { serializeDesignSystemMarkdown } from './design-system-markdown.serializer';

describe('serializeDesignSystemMarkdown', () => {
  it('serializes design system data in deterministic section order without internal ids', () => {
    const markdown = serializeDesignSystemMarkdown({
      brandEssence: 'Marca direta e confiavel.',
      desiredPerception: 'Premium, simples e operacional.',
      visualStyle: 'Editorial com tecnologia B2B.',
      antiPatterns: 'Evitar visual infantil.',
      conceptualReferences: 'SaaS editorial e dashboards financeiros.',
      aiNotes: 'Priorizar clareza em outputs visuais.',
      colorGroups: [
        {
          id: 'group-internal',
          name: 'Primarias',
          description: 'Cores principais.',
          sortOrder: 0,
          colors: [
            {
              id: 'color-internal',
              name: 'Azul Workana',
              value: '#155EEF',
              displayFormat: 'hex',
              semanticRole: 'accent',
              usageNote: 'Usar em CTAs.',
              restrictionNote: 'Nao usar em alertas.',
              sortOrder: 0,
            },
          ],
        },
      ],
      assets: [
        {
          id: 'asset-internal',
          title: 'Logo principal',
          description: 'Logo oficial horizontal.',
          primaryRole: 'logo',
          secondaryTags: ['horizontal'],
          fileName: 'logo.svg',
          contentType: 'image/svg+xml',
          objectKey: 'organizations/org-1/design-system/assets/asset-1/logo.svg',
        },
      ],
    });

    expect(markdown).toContain('# Design System');
    expect(markdown.indexOf('## Brand overview')).toBeLessThan(
      markdown.indexOf('## Identity principles'),
    );
    expect(markdown.indexOf('## Identity principles')).toBeLessThan(
      markdown.indexOf('## Color palette'),
    );
    expect(markdown).toContain('- Azul Workana: #155EEF (hex) — accent. Usar em CTAs. Restriction: Nao usar em alertas.');
    expect(markdown).toContain('- Logo principal — logo — logo.svg — Logo oficial horizontal. Tags: horizontal.');
    expect(markdown).not.toContain('group-internal');
    expect(markdown).not.toContain('asset-internal');
  });

  it('uses product-safe fallbacks for missing data', () => {
    const markdown = serializeDesignSystemMarkdown({
      brandEssence: null,
      desiredPerception: null,
      visualStyle: null,
      antiPatterns: null,
      conceptualReferences: null,
      aiNotes: null,
      colorGroups: [],
      assets: [],
    });

    expect(markdown).toContain('No brand overview has been registered yet.');
    expect(markdown).toContain('No official color palette has been registered yet.');
    expect(markdown).toContain('No official design assets have been registered yet.');
  });
});
