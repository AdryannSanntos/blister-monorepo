import type { CarouselNarrativeRole } from '@company-os/types';

import type { TruncatableSlideCopy } from './copy-limits.util';

const HASHTAG_PATTERN = /(?:^|\s)#[\p{L}\p{N}_]+/gu;
const INSTAGRAM_HANDLE_PATTERN = /@[\w.]+/g;
const MULTI_SPACE_PATTERN = /\s{2,}/g;

const HOOK_TITLE_LIMIT_CONTENT_MACHINE = 120;
const HOOK_TITLE_LIMIT_DEFAULT = 80;

export const stripHashtags = (value: string | undefined): string | undefined => {
  if (!value) return value;

  const withoutTags = value
    .replace(HASHTAG_PATTERN, ' ')
    .replace(INSTAGRAM_HANDLE_PATTERN, ' ')
    .replace(MULTI_SPACE_PATTERN, ' ')
    .trim();

  return withoutTags.length > 0 ? withoutTags : undefined;
};

const splitSentences = (text: string): string[] => {
  const matches = text.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g);
  return matches?.map((part) => part.trim()).filter(Boolean) ?? [text.trim()];
};

const takeFirstSentences = (text: string, maxChars: number): string => {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const sentences = splitSentences(trimmed);
  let result = '';

  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length > maxChars && result) break;
    if (candidate.length > maxChars) return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
    result = candidate;
  }

  return result || `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
};

const resolveHookHeadline = (slide: TruncatableSlideCopy): string | undefined => {
  const candidates = [slide.title, slide.subtitle, slide.body, slide.body2]
    .map((value) => stripHashtags(value))
    .filter((value): value is string => Boolean(value?.trim()));

  if (candidates.length === 0) return undefined;

  return candidates[0];
};

export type CopySanitizerOptions = {
  templateId?: string;
  narrativeRole?: CarouselNarrativeRole;
};

export const sanitizeSlideCopyFields = <T extends TruncatableSlideCopy>(
  slide: T,
  options?: CopySanitizerOptions,
): T => {
  const role = options?.narrativeRole ?? slide.narrativeRole;
  const isContentMachine = options?.templateId === 'content-machine';
  const sanitized = { ...slide };

  const fields = [
    'title',
    'subtitle',
    'body',
    'body2',
    'callToAction',
    'ctaKeyword',
    'ctaHint',
  ] as const;

  for (const field of fields) {
    const value = sanitized[field];
    if (typeof value === 'string') {
      sanitized[field] = stripHashtags(value) as T[typeof field];
    }
  }

  if (sanitized.listItems?.length) {
    sanitized.listItems = sanitized.listItems
      .map((item) => stripHashtags(item))
      .filter((item): item is string => Boolean(item));
  }

  if (role !== 'hook') return sanitized;

  const titleLimit = isContentMachine
    ? HOOK_TITLE_LIMIT_CONTENT_MACHINE
    : HOOK_TITLE_LIMIT_DEFAULT;
  const headline = resolveHookHeadline(sanitized);

  if (isContentMachine) {
    return {
      ...sanitized,
      title: headline ? takeFirstSentences(headline, titleLimit) : sanitized.title,
      subtitle: undefined,
      body: undefined,
      body2: undefined,
      callToAction: undefined,
      ctaKeyword: undefined,
      ctaHint: undefined,
      listItems: undefined,
    };
  }

  const supporting =
    stripHashtags(sanitized.subtitle) ??
    stripHashtags(sanitized.body) ??
    stripHashtags(sanitized.body2);

  return {
    ...sanitized,
    title: headline ? takeFirstSentences(headline, titleLimit) : sanitized.title,
    subtitle: supporting ? takeFirstSentences(supporting, 120) : undefined,
    body: undefined,
    body2: undefined,
    listItems: undefined,
  };
};
