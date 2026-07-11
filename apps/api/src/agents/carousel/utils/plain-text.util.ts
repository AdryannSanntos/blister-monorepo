import type { CarouselSlideType } from '@company-os/types';

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);

const convertAllowedHtmlToMarkers = (value: string): string => {
  let result = value;

  result = result.replace(
    /<span[^>]*class="[^"]*\baccent\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    '==$1==',
  );
  result = result.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**');

  return result;
};

/** Removes HTML tags and normalizes whitespace while preserving ==accent== and **bold** markers. */
export const toCarouselPlainText = (value: string | null | undefined): string | undefined => {
  if (value == null) return undefined;

  const withMarkers = convertAllowedHtmlToMarkers(value);
  const withoutTags = decodeHtmlEntities(withMarkers.replace(/<[^>]*>/g, ''));
  const lines = withoutTags
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return undefined;
  return lines.join('\n');
};

export const normalizeCarouselSlideCopy = (slide: {
  id: string;
  order: number;
  type: CarouselSlideType;
  title?: string;
  subtitle?: string;
  body?: string;
  body2?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
  imageBrief?: string;
}) => {
  const normalized = {
    ...slide,
    ...(slide.title != null ? { title: toCarouselPlainText(slide.title) } : {}),
    ...(slide.subtitle != null ? { subtitle: toCarouselPlainText(slide.subtitle) } : {}),
    ...(slide.body != null ? { body: toCarouselPlainText(slide.body) } : {}),
    ...(slide.body2 != null ? { body2: toCarouselPlainText(slide.body2) } : {}),
    ...(slide.callToAction != null
      ? { callToAction: toCarouselPlainText(slide.callToAction) }
      : {}),
    ...(slide.ctaKeyword != null
      ? { ctaKeyword: toCarouselPlainText(slide.ctaKeyword) }
      : {}),
    ...(slide.ctaHint != null ? { ctaHint: toCarouselPlainText(slide.ctaHint) } : {}),
    ...(Array.isArray(slide.listItems)
      ? {
          listItems: slide.listItems
            .map((item) => toCarouselPlainText(item))
            .filter((item): item is string => Boolean(item)),
        }
      : {}),
  };

  for (const key of [
    'title',
    'subtitle',
    'body',
    'body2',
    'callToAction',
    'ctaKeyword',
    'ctaHint',
    'imageBrief',
    'listItems',
  ] as const) {
    if (normalized[key] === null) {
      delete normalized[key];
    }
  }

  return normalized;
};
