import { hydrateSlideHtml, buildListHtml, replacePlaceholders } from './slide-template-engine';

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

  it('hydrates start slide with brand, badge and counter', () => {
    const template = `<div class="slide-start">
      <span class="slide-header__brand">{{brand}}</span>
      <span class="slide-header__meta">{{meta_right}}</span>
      <span class="badge-pill">{{badge}}</span>
      <h1>{{title}}</h1>
      <p>{{subtitle}}</p>
      <span>{{slide_current}}/{{slide_total}}</span>
      <span style="width: {{progress}}%"></span>
    </div>`;

    const html = hydrateSlideHtml({
      html: template,
      slide: {
        id: 'slide_1',
        order: 1,
        type: 'start',
        title: 'O FUTURO CHEGOU',
        body: 'Um dia mediado por IA',
      },
      variationId: 'v1',
      brand,
      totalSlides: 6,
      imageUrls: { image_url: 'https://example.com/cover.jpg' },
    });

    expect(html).toContain('Creator Lab');
    expect(html).toContain('@creatorlab');
    expect(html).toContain('1/6');
    expect(html).toContain('O FUTURO CHEGOU');
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
