import type { TruncatableSlideCopy } from './copy-limits.util';
import { applyCopyLimits } from './copy-limits.util';
import { guardSlideHighlights } from './highlight-guard.util';
import { splitOversizedContentMachineCopy } from './content-paragraph-splitter.util';

const stripBrokenMarkers = (value: string | undefined): string | undefined => {
  if (!value) return value;

  let result = value;
  const accentOpens = (result.match(/==/g) ?? []).length;
  if (accentOpens % 2 !== 0) {
    result = result.replace(/==[^=]*$/, (match) => match.replace(/==/g, ''));
  }

  const boldOpens = (result.match(/\*\*/g) ?? []).length;
  if (boldOpens % 2 !== 0) {
    result = result.replace(/\*\*[^*]*$/, (match) => match.replace(/\*\*/g, ''));
  }

  return result.trimEnd();
};

const sanitizeCopyFields = <T extends TruncatableSlideCopy>(slide: T): T => {
  const sanitized = { ...slide };
  const fields = ['title', 'subtitle', 'body', 'body2', 'callToAction', 'ctaKeyword', 'ctaHint'] as const;

  for (const field of fields) {
    const value = sanitized[field];
    if (typeof value === 'string') {
      sanitized[field] = stripBrokenMarkers(value) as T[typeof field];
    }
  }

  if (sanitized.listItems?.length) {
    sanitized.listItems = sanitized.listItems.map((item) => stripBrokenMarkers(item) ?? item);
  }

  return sanitized;
};

export const normalizeSlideCopy = <T extends TruncatableSlideCopy>(
  slide: T,
  options?: { templateId?: string },
): T => {
  const split = splitOversizedContentMachineCopy(slide, options);
  const guarded = guardSlideHighlights(split);
  const limited = applyCopyLimits(guarded, options);
  return sanitizeCopyFields(limited);
};
