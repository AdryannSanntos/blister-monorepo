import { join } from 'node:path';
import { CarouselTemplateService, TemplateNotFoundError } from './carousel-template.service';

const templatesRoot = join(__dirname, '..', 'templates');

describe('CarouselTemplateService', () => {
  const service = new CarouselTemplateService(templatesRoot);

  it('lists available templates', () => {
    const templates = service.listTemplates();
    expect(templates.map((t) => t.id)).toEqual(
      expect.arrayContaining(['editorial-performance', 'minimal-clean']),
    );
  });

  it('returns 3 image slots for editorial-performance text-image/v3', () => {
    const slots = service.getImageSlotsForVariation(
      'editorial-performance',
      'text_image',
      'v3',
    );
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.slotKey)).toEqual([
      'image_url',
      'image_url_2',
      'image_url_3',
    ]);
  });

  it('returns 0 slots for text/v1', () => {
    const slots = service.getImageSlotsForVariation('editorial-performance', 'text', 'v1');
    expect(slots).toHaveLength(0);
  });

  it('returns 1 slot for start/v1', () => {
    const slots = service.getImageSlotsForVariation('editorial-performance', 'start', 'v1');
    expect(slots).toHaveLength(1);
    expect(slots[0]?.slotKey).toBe('image_url');
  });

  it('throws TemplateNotFoundError for missing template', () => {
    expect(() => service.getTemplate('non-existent-template')).toThrow(TemplateNotFoundError);
  });

  it('loads slide variation HTML and CSS', () => {
    const variation = service.getSlideVariation('editorial-performance', 'text', 'v1');
    expect(variation.html).toContain('{{title}}');
    expect(variation.css.length).toBeGreaterThan(0);
    expect(variation.baseCss.length).toBeGreaterThan(0);
  });

  it('maps text_image schema type to text-image directory', () => {
    const variation = service.getSlideVariation('editorial-performance', 'text_image', 'v3');
    expect(variation.slideType).toBe('text_image');
    expect(variation.html).toContain('{{image_url_3}}');
  });
});
