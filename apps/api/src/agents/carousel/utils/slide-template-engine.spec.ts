import { hydrateSlideHtml, buildListHtml, replacePlaceholders, resolveCopyDensity } from './slide-template-engine';

const brand = {
  brandName: 'Creator Lab',
  instagramHandle: '@creatorlab',
  accentColor: '#FF4A0A',
  metaRightMode: 'handle' as const,
};

describe('slide-template-engine', () => {
  it('builds list HTML with arrow list items', () => {
    expect(buildListHtml(['Item A', 'Item B'])).toBe(
      '<li>Item A</li><li>Item B</li>',
    );
  });

  it('hydrates start slide with brand, badge, accent title and counter', () => {
    const template = `<div class="slide-start">
      <span>{{badge}}</span>
      <h1 class="display-title slide-start__title">{{title}}</h1>
      <p>{{subtitle}}</p>
      <span>{{brand}}</span>
      <span>{{meta_right}}</span>
      <span>{{slide_current}}/{{slide_total}}</span>
    </div>`;

    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_1',
        order: 1,
        type: 'start',
        title: 'CANNABIS ==LEGAL== NO BRASIL',
        subtitle: 'O debate avança',
      },
      variationId: 'v1',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain('<span class="accent">LEGAL</span>');
    expect(html).toContain('Creator Lab');
    expect(html).toContain('@creatorlab');
    expect(html).toContain('1/5');
    expect(html).not.toMatch(/\{\{/);
  });

  it('hydrates text-image slide with image URLs', () => {
    const template = `<img src="{{image_url}}" alt="" />`;

    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text_image',
        title: 'Café inteligente',
        body: 'A cafeteira prepara antes do alarme.',
      },
      variationId: 'v2',
      brand,
      totalSlides: 6,
      imageUrls: { image_url: 'https://example.com/coffee.jpg' },
    });

    expect(html).toContain('https://example.com/coffee.jpg');
    expect(html).not.toMatch(/\{\{/);
  });

  it('hydrates CTA slide with keyword and hint mapping', () => {
    const template = `<div class="slide-cta">
      <p>{{body}}</p>
      <p>{{subtitle}}</p>
      <span>{{call_to_action}}</span>
      <span class="keyword">{{title}}</span>
      <p>{{badge}}</p>
    </div>`;

    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_6',
        order: 6,
        type: 'text',
        narrativeRole: 'cta',
        body: 'Amanhã já será outro dia.',
        ctaHint: 'Salve este carrossel',
        callToAction: 'Toque em salvar e revise amanhã',
        ctaKeyword: 'SALVAR',
      },
      variationId: 'v3',
      brand,
      totalSlides: 6,
      imageUrls: {},
    });

    expect(html).toContain('SALVAR');
    expect(html).toContain('Salve este carrossel');
    expect(html).toContain('@creatorlab');
    expect(html).not.toMatch(/\{\{/);
  });

  it('strips empty image card blocks', () => {
    const template = `<div class="card-white hero-card"><img src="{{image_url}}" alt="" /></div>`;

    const html = hydrateSlideHtml({
      html: template,
      slide: { id: 'slide_2', order: 2, type: 'text_image' },
      variationId: 'v2',
      brand,
      totalSlides: 4,
      imageUrls: {},
    });

    expect(html).not.toContain('card-white');
    expect(html).not.toMatch(/\{\{/);
  });

  it('replacePlaceholders is case-insensitive', () => {
    expect(replacePlaceholders('{{BRAND}} and {{brand}}', { brand: 'X' })).toBe('X and X');
  });

  it('hydrates meta_center and meta_year for triple header templates', () => {
    const template = `<span>{{meta_center}}</span><span>{{meta_year}}</span>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: { id: 'slide_2', order: 2, type: 'text' },
      variationId: 'v1',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain('@creatorlab');
    expect(html).toMatch(/\d{4} \/\//);
    expect(html).not.toMatch(/\{\{/);
  });

  it('renders accent and bold markers in copy fields', () => {
    const template = `<h1>{{title}}</h1><p>{{body}}</p>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text_image',
        title: 'MUDANÇA 2: ==COMENTÁRIOS==',
        body: 'O algoritmo mede **conversas reais**.',
      },
      variationId: 'v1',
      brand,
      totalSlides: 6,
      imageUrls: {},
    });

    expect(html).toContain('<span class="accent">COMENTÁRIOS</span>');
    expect(html).toContain('<strong>conversas reais</strong>');
  });

  it('does not duplicate body in closing when callToAction is absent', () => {
    const template = `<p class="slide-proof-headline-first__intro">{{body}}</p><p class="slide-proof-headline-first__closing">{{call_to_action}}</p>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text_image',
        body: 'Texto único do slide.',
      },
      variationId: 'v1',
      brand,
      totalSlides: 6,
      imageUrls: {},
    });

    expect(html.match(/Texto único do slide\./g)?.length).toBe(1);
    expect(html).not.toContain('slide-proof-headline-first__closing');
  });

  it('does not treat text_image v3 as a CTA slide', () => {
    const template = `<h1>{{title}}</h1><p>{{body}}</p>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_3',
        order: 3,
        type: 'text_image',
        title: 'Título ==DESTAQUE== editorial',
        body: 'Corpo do slide',
      },
      variationId: 'v3',
      brand,
      totalSlides: 6,
      imageUrls: {},
    });

    expect(html).toContain('<span class="accent">DESTAQUE</span>');
    expect(html).toContain('Corpo do slide');
  });

  it('hydrates body2 and respects content-machine copy limits on hydrate', () => {
    const template = `<div class="copy-stack">
      <p class="copy-block copy-block--serif">{{body}}</p>
      <p class="copy-block copy-block--sans">{{body2}}</p>
      <p class="copy-block copy-block--serif">{{subtitle}}</p>
    </div>`;

    const longBody = 'a'.repeat(250);
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text',
        narrativeRole: 'scene',
        body: longBody,
        body2: 'Segundo bloco com ==destaque==.',
        subtitle: 'Terceiro bloco.',
      },
      variationId: 'v3',
      templateId: 'content-machine',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain(`${'a'.repeat(219)}…`);
    expect(html).toContain('<span class="accent">destaque</span>');
    expect(html).toContain('Terceiro bloco.');
    expect(html).not.toMatch(/\{\{/);
  });

  it('strips empty body2 copy blocks', () => {
    const template = `<p class="copy-block">{{body}}</p><p class="copy-block">{{body2}}</p>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text',
        body: 'Primeiro bloco.',
      },
      variationId: 'v3',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain('Primeiro bloco.');
    expect(html.match(/<p class="copy-block">/g)?.length).toBe(1);
  });

  it('resolves copy density from total text length', () => {
    expect(
      resolveCopyDensity({
        id: 'slide_2',
        order: 2,
        type: 'text',
        body: 'a'.repeat(120),
        body2: 'b'.repeat(120),
        subtitle: 'c'.repeat(50),
      }),
    ).toBe('normal');

    expect(
      resolveCopyDensity({
        id: 'slide_2',
        order: 2,
        type: 'text',
        body: 'a'.repeat(200),
        body2: 'b'.repeat(200),
        subtitle: 'c'.repeat(100),
      }),
    ).toBe('compact');
  });

  it('injects data-density on slide root element', () => {
    const template = `<div class="slide theme-navy slide-proof"><p>{{body}}</p></div>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_2',
        order: 2,
        type: 'text',
        body: 'Texto curto.',
      },
      variationId: 'v3',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain('data-density="airy"');
  });

  it('resolves ctaKeyword placeholder from LLM html on CTA slides', () => {
    const template = `<span class="keyword">{{ctaKeyword}}</span><span>{{ctaHint}}</span>`;
    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_5',
        order: 5,
        type: 'text',
        narrativeRole: 'cta',
        ctaKeyword: 'SALVAR',
        ctaHint: 'Revise amanhã',
      },
      variationId: 'v3',
      brand,
      totalSlides: 5,
      imageUrls: {},
    });

    expect(html).toContain('SALVAR');
    expect(html).toContain('Revise amanhã');
    expect(html).not.toMatch(/\{\{/);
  });
});
