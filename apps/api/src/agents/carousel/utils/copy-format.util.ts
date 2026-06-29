const escapeHtmlText = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ALLOWED_TAG_PATTERN =
  /<\/?(?:span class="accent"|strong|b)(?:\s[^>]*)?>|<\/(?:span|strong|b)>/gi;

export const sanitizeAllowedCopyHtml = (value: string): string => {
  const placeholders: string[] = [];
  const masked = value.replace(ALLOWED_TAG_PATTERN, (tag) => {
    const token = `__TAG_${placeholders.length}__`;
    placeholders.push(tag);
    return token;
  });

  let escaped = escapeHtmlText(masked);
  for (const [index, tag] of placeholders.entries()) {
    escaped = escaped.replace(`__TAG_${index}__`, tag);
  }

  return escaped;
};

export const formatCarouselCopyHtml = (value: string | undefined): string => {
  if (!value?.trim()) return '';

  if (/<(?:span|strong|b)\b/i.test(value)) {
    return sanitizeAllowedCopyHtml(value);
  }

  let result = escapeHtmlText(value);
  result = result.replace(/==([^=\n]+?)==/g, '<span class="accent">$1</span>');
  result = result.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

  return result;
};
