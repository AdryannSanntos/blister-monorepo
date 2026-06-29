import type { CarouselSlideType } from '@company-os/types';
import { hydrateSlideHtml } from './slide-template-engine';
import type { CarouselTemplateService } from '../services/carousel-template.service';

const REQUIRED_SHELL_SELECTORS = ['slide-header', 'slide-main', 'slide-footer'] as const;

const REQUIRED_PLACEHOLDERS = [
  'brand',
  'meta_right',
  'slide_current',
  'slide_total',
  'progress',
] as const;

const ALLOWED_PLACEHOLDERS = new Set([
  'brand',
  'meta_right',
  'meta_center',
  'meta_year',
  'title',
  'subtitle',
  'body',
  'body2',
  'call_to_action',
  'calltoaction',
  'ctakeyword',
  'cta_keyword',
  'ctahint',
  'cta_hint',
  'list_html',
  'image_url',
  'image_url_2',
  'image_url_3',
  'badge',
  'slide_current',
  'slide_total',
  'progress',
]);

const EDITORIAL_THEME_CLASSES = ['theme-dark', 'theme-light', 'theme-section'] as const;

const CONTENT_MACHINE_THEME_CLASSES = [
  'theme-cover',
  'theme-accent',
  'theme-light',
  'theme-navy',
] as const;

const isStructuredTemplate = (templateId: string): boolean =>
  templateId === 'editorial-performance' || templateId === 'content-machine';

const resolveThemeClasses = (templateId: string): readonly string[] =>
  templateId === 'content-machine' ? CONTENT_MACHINE_THEME_CLASSES : EDITORIAL_THEME_CLASSES;

const SAMPLE_BRAND = {
  brandName: 'BLISTER',
  instagramHandle: '@blister',
  accentColor: '#FF4A0A',
  metaRightMode: 'handle' as const,
};

export type TemplateValidationIssue = {
  templateId: string;
  slideType: string;
  variationId: string;
  code: string;
  message: string;
};

const extractPlaceholders = (html: string): string[] => {
  const matches = html.matchAll(/\{\{([a-z0-9_]+)\}\}/gi);
  return [...matches].map((match) => match[1]?.toLowerCase()).filter(Boolean) as string[];
};

const resolveManifestSlideTypes = (
  slides: Record<string, unknown>,
): Array<{ dirType: string; schemaType: CarouselSlideType }> => {
  const result: Array<{ dirType: string; schemaType: CarouselSlideType }> = [];

  for (const dirType of Object.keys(slides)) {
    const schemaType = dirType === 'text-image' ? 'text_image' : (dirType as CarouselSlideType);
    result.push({ dirType, schemaType });
  }

  return result;
};

const resolveVariationIds = (entry: unknown): string[] => {
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === 'object') return Object.keys(entry);
  return [];
};

export const validateCarouselTemplateVariation = (input: {
  templateId: string;
  slideType: CarouselSlideType;
  variationId: string;
  html: string;
  css: string;
  baseCss: string;
}): TemplateValidationIssue[] => {
  const issues: TemplateValidationIssue[] = [];
  const { templateId, slideType, variationId, html, css, baseCss } = input;
  const context = { templateId, slideType, variationId };

  if (!html.includes('class="slide')) {
    issues.push({
      ...context,
      code: 'missing_slide_root',
      message: 'Root element must use class="slide".',
    });
  }

  if (isStructuredTemplate(templateId)) {
    const hasTheme = resolveThemeClasses(templateId).some((theme) => html.includes(theme));
    if (!hasTheme) {
      issues.push({
        ...context,
        code: 'missing_theme_class',
        message: `Slide must include one of: ${resolveThemeClasses(templateId).join(', ')}.`,
      });
    }

    for (const selector of REQUIRED_SHELL_SELECTORS) {
      if (!html.includes(selector)) {
        issues.push({
          ...context,
          code: 'missing_shell',
          message: `Missing structural block ".${selector}".`,
        });
      }
    }
  }

  if (templateId === 'content-machine' && slideType !== 'start' && html.includes('{{title}}')) {
    issues.push({
      ...context,
      code: 'title_on_internal_slide',
      message: 'content-machine internal slides must not use {{title}} — use body/subtitle/call_to_action.',
    });
  }

  if (templateId === 'content-machine' && slideType === 'start' && !html.includes('{{title}}')) {
    issues.push({
      ...context,
      code: 'missing_cover_title',
      message: 'content-machine cover slide must include {{title}}.',
    });
  }

  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    if (!html.includes(`{{${placeholder}}}`)) {
      issues.push({
        ...context,
        code: 'missing_required_placeholder',
        message: `Missing required placeholder {{${placeholder}}}.`,
      });
    }
  }

  for (const placeholder of extractPlaceholders(html)) {
    if (!ALLOWED_PLACEHOLDERS.has(placeholder)) {
      issues.push({
        ...context,
        code: 'unknown_placeholder',
        message: `Unknown placeholder {{${placeholder}}}.`,
      });
    }
  }

  const assembledCss = [baseCss, css].filter(Boolean).join('\n');

  if (!assembledCss.includes('.accent')) {
    issues.push({
      ...context,
      code: 'missing_accent_style',
      message: 'CSS must define .accent for title highlights.',
    });
  }

  if (!assembledCss.includes('.display-title') && !assembledCss.includes('.impact-title')) {
    issues.push({
      ...context,
      code: 'missing_display_title',
      message: 'CSS must define .display-title or .impact-title typography.',
    });
  }

  if (isStructuredTemplate(templateId) && !assembledCss.includes('--accent')) {
    issues.push({
      ...context,
      code: 'missing_accent_token',
      message: 'CSS must declare --accent design token.',
    });
  }

  if (
    html.includes('{{title}}') &&
    !assembledCss.includes('.display-title') &&
    !assembledCss.includes('.impact-title')
  ) {
    issues.push({
      ...context,
      code: 'title_without_typography',
      message: 'Slide uses {{title}} but lacks .display-title styles.',
    });
  }

  try {
    const hydrated = hydrateSlideHtml({
      html,
      slide: {
        id: 'validation_slide',
        order: slideType === 'start' ? 1 : 3,
        type: slideType,
        narrativeRole:
          slideType === 'start'
            ? 'hook'
            : variationId === 'v3' && slideType === 'text'
              ? 'cta'
              : 'scene',
        title: 'Título ==DESTAQUE== editorial',
        subtitle: 'Linha de apoio clara',
        body: 'Corpo com **ênfase** onde faz sentido.',
        body2: 'Segundo bloco com ==destaque==.',
        callToAction: 'Fechamento objetivo',
        ctaKeyword: 'SALVAR',
        ctaHint: 'Siga @blister',
        listItems: ['**Pilar 1** — detalhe', 'Pilar 2 — outro detalhe'],
      },
      variationId,
      brand: SAMPLE_BRAND,
      totalSlides: 5,
      imageUrls: {
        image_url: 'https://example.com/sample.jpg',
        image_url_2: 'https://example.com/sample-2.jpg',
        image_url_3: 'https://example.com/sample-3.jpg',
      },
    });

    if (hydrated.match(/\{\{[a-z0-9_]+\}\}/i)) {
      issues.push({
        ...context,
        code: 'hydration_unresolved',
        message: 'Sample hydration left unresolved placeholders.',
      });
    }

    if (
      html.includes('{{title}}') &&
      !(slideType === 'text' && variationId === 'v3') &&
      !hydrated.includes('class="accent"')
    ) {
      issues.push({
        ...context,
        code: 'title_highlight_missing',
        message: 'Title hydration must render ==accent== markers as .accent spans.',
      });
    }
  } catch (error) {
    issues.push({
      ...context,
      code: 'hydration_failed',
      message: error instanceof Error ? error.message : 'Hydration failed.',
    });
  }

  return issues;
};

export const validateAllCarouselTemplates = (
  service: CarouselTemplateService,
  options?: { templateIds?: string[] },
): TemplateValidationIssue[] => {
  const issues: TemplateValidationIssue[] = [];
  const allowedTemplateIds = options?.templateIds;

  for (const template of service.listTemplates()) {
    if (allowedTemplateIds && !allowedTemplateIds.includes(template.id)) continue;

    const manifest = service.getTemplate(template.id);
    const isStructured = isStructuredTemplate(template.id);

    for (const { dirType, schemaType } of resolveManifestSlideTypes(
      manifest.slides as Record<string, unknown>,
    )) {
      const entry = manifest.slides[dirType as keyof typeof manifest.slides];
      const variationIds = resolveVariationIds(entry);

      for (const variationId of variationIds) {
        const variation = service.getSlideVariation(template.id, schemaType, variationId);
        const variationIssues = validateCarouselTemplateVariation({
          templateId: template.id,
          slideType: schemaType,
          variationId,
          html: variation.html,
          css: variation.css,
          baseCss: variation.baseCss,
        });

        issues.push(
          ...variationIssues.filter((issue) => {
            if (isStructured) return true;
            return ![
              'missing_shell',
              'missing_theme_class',
              'missing_accent_style',
              'missing_display_title',
              'missing_accent_token',
              'title_without_typography',
              'missing_required_placeholder',
            ].includes(issue.code);
          }),
        );
      }
    }
  }

  return issues;
};

export const formatTemplateValidationReport = (
  issues: TemplateValidationIssue[],
): string => {
  if (issues.length === 0) return 'All carousel templates passed validation.';

  return issues
    .map(
      (issue) =>
        `[${issue.templateId}/${issue.slideType}/${issue.variationId}] ${issue.code}: ${issue.message}`,
    )
    .join('\n');
};
