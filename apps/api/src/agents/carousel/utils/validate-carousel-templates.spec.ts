import { join } from 'node:path';
import { CarouselTemplateService } from '../services/carousel-template.service';
import {
  formatTemplateValidationReport,
  validateAllCarouselTemplates,
  validateCarouselTemplateVariation,
} from './validate-carousel-templates';

const templatesRoot = join(__dirname, '..', 'templates');

describe('carousel template validation', () => {
  const service = new CarouselTemplateService(templatesRoot);

  it('validates editorial-performance template without issues', () => {
    const issues = validateAllCarouselTemplates(service, {
      templateIds: ['editorial-performance'],
    });

    if (issues.length > 0) {
      // eslint-disable-next-line no-console
      console.error(formatTemplateValidationReport(issues));
    }

    expect(issues).toEqual([]);
  });

  it('validates content-machine template without issues', () => {
    const issues = validateAllCarouselTemplates(service, {
      templateIds: ['content-machine'],
    });

    if (issues.length > 0) {
      // eslint-disable-next-line no-console
      console.error(formatTemplateValidationReport(issues));
    }

    expect(issues).toEqual([]);
  });

  it('validates all templates for hydration safety', () => {
    const issues = validateAllCarouselTemplates(service);
    const blocking = issues.filter(
      (issue) =>
        issue.code === 'hydration_failed' ||
        issue.code === 'hydration_unresolved' ||
        issue.code === 'unknown_placeholder',
    );

    if (blocking.length > 0) {
      // eslint-disable-next-line no-console
      console.error(formatTemplateValidationReport(blocking));
    }

    expect(blocking).toEqual([]);
  });

  it('start/v1 renders accent highlights on dark theme titles', () => {
    const variation = service.getSlideVariation('editorial-performance', 'start', 'v1');
    const issues = validateCarouselTemplateVariation({
      templateId: 'editorial-performance',
      slideType: 'start',
      variationId: 'v1',
      html: variation.html,
      css: [variation.baseCss, variation.css].join('\n'),
      baseCss: variation.baseCss,
    });

    expect(issues.filter((issue) => issue.code === 'title_highlight_missing')).toEqual([]);
    expect([variation.baseCss, variation.css].join('\n')).toMatch(
      /\.theme-dark\s+\.display-title\s+\.accent|\.theme-dark\s+\.slide-start__title\s+\.accent/,
    );
  });

  it('text/v3 close slide hydrates CTA fields elegantly', () => {
    const variation = service.getSlideVariation('editorial-performance', 'text', 'v3');
    expect(variation.html).toContain('slide-close');
    expect(variation.html).not.toContain('slide-cta__box');
  });
});
