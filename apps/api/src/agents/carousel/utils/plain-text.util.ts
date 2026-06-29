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
export const toCarouselPlainText = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;

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
  type: string;
  title?: string;
  subtitle?: string;
  body?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
  imageBrief?: string;
}) => ({
  ...slide,
  ...(slide.title !== undefined ? { title: toCarouselPlainText(slide.title) } : {}),
  ...(slide.subtitle !== undefined ? { subtitle: toCarouselPlainText(slide.subtitle) } : {}),
  ...(slide.body !== undefined ? { body: toCarouselPlainText(slide.body) } : {}),
  ...(slide.callToAction !== undefined
    ? { callToAction: toCarouselPlainText(slide.callToAction) }
    : {}),
  ...(slide.ctaKeyword !== undefined
    ? { ctaKeyword: toCarouselPlainText(slide.ctaKeyword) }
    : {}),
  ...(slide.ctaHint !== undefined ? { ctaHint: toCarouselPlainText(slide.ctaHint) } : {}),
  ...(slide.listItems !== undefined
    ? {
        listItems: slide.listItems
          .map((item) => toCarouselPlainText(item))
          .filter((item): item is string => Boolean(item)),
      }
    : {}),
});
