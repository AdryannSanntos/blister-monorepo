const MARKER_PATTERN = /(==([^=\n]+?)==|\*\*([^*\n]+?)\*\*)/g;

const MAX_HIGHLIGHT_LENGTH = 40;
const MAX_HIGHLIGHT_WORDS = 3;

const guardHighlightsInText = (text: string): string => {
  if (!text?.trim()) return text;

  let foundFirst = false;

  return text.replace(MARKER_PATTERN, (match, _full, accentInner, boldInner) => {
    const inner = (accentInner ?? boldInner ?? '').trim();
    const isAccent = match.startsWith('==');

    if (!inner) return match;

    if (foundFirst || inner.length > MAX_HIGHLIGHT_LENGTH || inner.split(/\s+/).length > MAX_HIGHLIGHT_WORDS) {
      return inner;
    }

    foundFirst = true;
    return isAccent ? `==${inner}==` : `**${inner}**`;
  });
};

const COPY_FIELDS = ['title', 'subtitle', 'body', 'body2', 'callToAction', 'ctaKeyword', 'ctaHint'] as const;

export type HighlightGuardableSlide = {
  title?: string;
  subtitle?: string;
  body?: string;
  body2?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
};

export const guardSlideHighlights = <T extends HighlightGuardableSlide>(slide: T): T => {
  const guarded = { ...slide };

  for (const field of COPY_FIELDS) {
    const value = guarded[field];
    if (typeof value === 'string') {
      guarded[field] = guardHighlightsInText(value) as T[typeof field];
    }
  }

  if (guarded.listItems?.length) {
    guarded.listItems = guarded.listItems.map((item) => guardHighlightsInText(item));
  }

  return guarded;
};
