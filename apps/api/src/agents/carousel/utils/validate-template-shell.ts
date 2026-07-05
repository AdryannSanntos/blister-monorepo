import type { CarouselSlideType } from '@company-os/types';
import { CarouselTemplateService } from '../services/carousel-template.service';
import {
  isCoverVariation,
  resolveSpotlightHeaderSelectors,
  TEMPLATE_SHELL_RULES,
} from './template-shell-rules';

export type TemplateShellIssue = {
  templateId: string;
  slideType: string;
  variationId: string;
  code: string;
  message: string;
};

const TARGET_TEMPLATES = ['daylight', 'reel', 'spotlight', 'voltage'] as const;

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

export const validateTemplateShellHtml = (input: {
  templateId: string;
  slideType: string;
  variationId: string;
  html: string;
}): TemplateShellIssue[] => {
  const { templateId, slideType, variationId, html } = input;
  const rules = TEMPLATE_SHELL_RULES[templateId];
  if (!rules) return [];

  const issues: TemplateShellIssue[] = [];
  const context = { templateId, slideType, variationId };
  const isCover = isCoverVariation(templateId, slideType, variationId);

  if (!html.includes('class="slide')) {
    issues.push({
      ...context,
      code: 'missing_slide_root',
      message: 'Root element must use class="slide".',
    });
  }

  const headerSelectors =
    templateId === 'spotlight'
      ? resolveSpotlightHeaderSelectors(slideType, variationId)
      : [rules.headerSelector];

  for (const selector of headerSelectors) {
    const className = selector.replace(/^\./, '');
    if (!html.includes(className)) {
      issues.push({
        ...context,
        code: 'missing_header',
        message: `Missing header block "${selector}".`,
      });
    }
  }

  for (const selector of rules.requiredSelectors) {
    const className = selector.replace(/^\./, '');
    if (!html.includes(className)) {
      issues.push({
        ...context,
        code: 'missing_shell_part',
        message: `Missing required shell element "${selector}".`,
      });
    }
  }

  if (rules.requiresProgress && !html.includes('{{progress}}')) {
    issues.push({
      ...context,
      code: 'missing_progress_placeholder',
      message: 'Missing {{progress}} placeholder on progress fill.',
    });
  }

  const footerHidden = html.includes('slide-footer--hidden');
  if (isCover && !footerHidden) {
    issues.push({
      ...context,
      code: 'cover_footer_visible',
      message: 'Cover slide must use slide-footer--hidden.',
    });
  }
  if (!isCover && footerHidden) {
    issues.push({
      ...context,
      code: 'internal_footer_hidden',
      message: 'Internal slide must show progress footer (no slide-footer--hidden).',
    });
  }

  if (templateId === 'spotlight' && !isCover && !html.includes('slide__bg')) {
    issues.push({
      ...context,
      code: 'missing_ambient_bg',
      message: 'Internal spotlight slide must include .slide__bg ambient layer.',
    });
  }

  return issues;
};

export const validateAllTemplateShells = (
  service: CarouselTemplateService,
  templateIds: readonly string[] = TARGET_TEMPLATES,
): TemplateShellIssue[] => {
  const issues: TemplateShellIssue[] = [];

  for (const templateId of templateIds) {
    if (!TEMPLATE_SHELL_RULES[templateId]) continue;

    const manifest = service.getTemplate(templateId);
    const slideTypes = resolveManifestSlideTypes(manifest.slides as Record<string, unknown>);

    for (const { dirType, schemaType } of slideTypes) {
      const entry = (manifest.slides as Record<string, unknown>)[dirType];
      for (const variationId of resolveVariationIds(entry)) {
        const variation = service.getSlideVariation(templateId, schemaType, variationId);
        issues.push(
          ...validateTemplateShellHtml({
            templateId,
            slideType: dirType,
            variationId,
            html: variation.html,
          }),
        );
      }
    }
  }

  return issues;
};
