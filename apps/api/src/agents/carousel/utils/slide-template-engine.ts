import type { CarouselBrandContext, CarouselNarrativeRole, CarouselSlideType } from '@company-os/types';
import { applyCopyLimits } from './copy-limits.util';
import { formatCarouselCopyHtml } from './copy-format.util';

export type SlideContentInput = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
  title?: string;
  subtitle?: string;
  body?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
};

export type HydrateSlideHtmlInput = {
  html: string;
  slide: SlideContentInput;
  variationId: string;
  brand: CarouselBrandContext;
  totalSlides: number;
  imageUrls: Record<string, string>;
};

const PLACEHOLDER_PATTERN = /\{\{([a-z0-9_]+)\}\}/gi;

export const buildListHtml = (items: string[] | undefined): string => {
  if (!items?.length) return '';
  return items
    .slice(0, 4)
    .map((item) => `<li>${formatCarouselCopyHtml(item)}</li>`)
    .join('');
};

const resolveContentVariables = (
  slide: SlideContentInput,
  variationId: string,
): Record<string, string> => {
  const isCtaSlide = slide.narrativeRole === 'cta' || variationId === 'v3';
  const isStartSlide = slide.type === 'start';

  const ctaKeyword = formatCarouselCopyHtml(slide.ctaKeyword ?? slide.title ?? '');
  const ctaHint = formatCarouselCopyHtml(slide.ctaHint ?? slide.subtitle ?? '');
  const callToAction = formatCarouselCopyHtml(slide.callToAction ?? '');

  if (isCtaSlide) {
    return {
      title: ctaKeyword,
      subtitle: ctaHint,
      body: formatCarouselCopyHtml(slide.body ?? ''),
      call_to_action: callToAction,
      ctaKeyword,
      cta_keyword: ctaKeyword,
      ctaHint,
      cta_hint: ctaHint,
      callToAction: callToAction,
    };
  }

  if (isStartSlide) {
    return {
      title: formatCarouselCopyHtml(slide.title ?? ''),
      subtitle: formatCarouselCopyHtml(slide.subtitle ?? slide.body ?? ''),
      ctaKeyword: '',
      cta_keyword: '',
      ctaHint: '',
      cta_hint: '',
      callToAction: callToAction,
    };
  }

  return {
    title: formatCarouselCopyHtml(slide.title ?? ''),
    subtitle: formatCarouselCopyHtml(slide.subtitle ?? ''),
    body: formatCarouselCopyHtml(slide.body ?? ''),
    call_to_action: callToAction,
    list_html: buildListHtml(slide.listItems),
    ctaKeyword: ctaKeyword || callToAction,
    cta_keyword: ctaKeyword || callToAction,
    ctaHint,
    cta_hint: ctaHint,
    callToAction: callToAction,
  };
};

export const replacePlaceholders = (
  html: string,
  variables: Record<string, string>,
): string => {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
  }
  return result;
};

const stripEmptyImageBlocks = (html: string): string => {
  let result = html;

  result = result.replace(
    /<div class="[^"]*card-white[^"]*"[^>]*>\s*<img\s+src=""\s+alt=""\s*\/?>\s*<\/div>/gi,
    '',
  );
  result = result.replace(/<img\s+src=""\s+alt=""\s*\/?>/gi, '');
  result = result.replace(
    /<div class="slide-start__bg">\s*<img\s+src=""\s+alt=""\s*\/?>\s*<div class="slide-start__overlay"><\/div>\s*<\/div>/gi,
    '<div class="slide-start__bg slide-start__bg--fallback"><div class="slide-start__overlay"></div></div>',
  );

  return result;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stripEmptyCopyBlocks = (html: string): string => {
  let result = html;

  result = result.replace(/<p[^>]*>\s*<\/p>/gi, '');
  result = result.replace(/<p[^>]*__closing[^>]*>\s*<\/p>/gi, '');
  result = result.replace(/<p[^>]*__intro[^>]*>\s*<\/p>/gi, '');
  result = result.replace(/<p[^>]*__support[^>]*>\s*<\/p>/gi, '');
  result = result.replace(/<p[^>]*__lead[^>]*>\s*<\/p>/gi, '');

  return result;
};

export const hydrateSlideHtml = (input: HydrateSlideHtmlInput): string => {
  const { slide, brand, totalSlides, imageUrls } = input;
  const limitedSlide: SlideContentInput = {
    ...slide,
    ...applyCopyLimits(slide),
  };
  const progress = totalSlides > 0 ? Math.round((slide.order / totalSlides) * 100) : 0;

  const variables: Record<string, string> = {
    brand: escapeHtml(brand.brandName),
    meta_right: escapeHtml(
      brand.metaRightMode === 'date'
        ? new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).format(new Date())
        : brand.instagramHandle,
    ),
    badge: escapeHtml(brand.instagramHandle),
    slide_current: String(slide.order),
    slide_total: String(totalSlides),
    progress: String(progress),
    ...resolveContentVariables(limitedSlide, input.variationId),
    ...imageUrls,
  };

  for (const match of input.html.matchAll(/\{\{(image_url(?:_\d+)?)\}\}/gi)) {
    const slotKey = match[1]?.toLowerCase();
    if (slotKey && !(slotKey in variables)) {
      variables[slotKey] = '';
    }
  }

  for (const match of input.html.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1]?.toLowerCase();
    if (!key || key in variables) continue;

    if (key === 'list_html') {
      variables[key] = buildListHtml(limitedSlide.listItems);
      continue;
    }

    variables[key] = '';
  }

  let html = replacePlaceholders(input.html, variables);
  html = stripEmptyImageBlocks(html);
  html = stripEmptyCopyBlocks(html);

  const remaining = html.match(PLACEHOLDER_PATTERN);
  if (remaining?.length) {
    const unique = [...new Set(remaining)];
    throw new Error(
      `Unresolved slide placeholders for ${slide.id}: ${unique.join(', ')}`,
    );
  }

  return html;
};

export const hasUnresolvedPlaceholders = (html: string): boolean =>
  PLACEHOLDER_PATTERN.test(html);
