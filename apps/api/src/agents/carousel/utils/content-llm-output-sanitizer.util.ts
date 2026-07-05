const COPY_STRING_FIELDS = [
  'title',
  'subtitle',
  'body',
  'body2',
  'callToAction',
  'ctaKeyword',
  'ctaHint',
  'imageBrief',
] as const;

const normalizeLiteralNewlines = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  // Replace literal \n (2-char sequence: backslash + n) with a real newline
  return value.replace(/\\n/g, '\n');
};

export const sanitizeContentLlmOutput = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw;

  const record = raw as { slides?: unknown };
  if (!Array.isArray(record.slides)) return raw;

  return {
    ...record,
    slides: record.slides
      .filter((slide) => slide && typeof slide === 'object')
      .map((slide) => {
        const copy = { ...(slide as Record<string, unknown>) };
        for (const key of COPY_STRING_FIELDS) {
          if (copy[key] === null) {
            delete copy[key];
          } else {
            copy[key] = normalizeLiteralNewlines(copy[key]);
          }
        }
        if (copy.listItems === null) {
          delete copy.listItems;
        } else if (Array.isArray(copy.listItems)) {
          copy.listItems = copy.listItems.map(normalizeLiteralNewlines);
        }
        return copy;
      }),
  };
};
