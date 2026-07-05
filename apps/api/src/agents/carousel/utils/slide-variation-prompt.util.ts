const PLACEHOLDER_REGEX = /\{\{([a-z0-9_]+)\}\}/gi;

/** Compact variation summary for LLM prompts — avoids shipping full CSS (often 8–10 KB/slide). */
export const summarizeVariationForPrompt = (html: string): string => {
  const placeholders = [...html.matchAll(PLACEHOLDER_REGEX)]
    .map((match) => match[1]?.toLowerCase())
    .filter(Boolean) as string[];
  const uniquePlaceholders = [...new Set(placeholders)];

  const rootClassMatch = html.match(/class="([^"]+)"/);
  const rootClasses = rootClassMatch?.[1]?.split(/\s+/).slice(0, 5).join(' ') ?? 'slide';

  const normalizedHtml = html.replace(/\s+/g, ' ').trim();
  const htmlPreview =
    normalizedHtml.length > 480 ? `${normalizedHtml.slice(0, 477)}...` : normalizedHtml;

  return [
    `rootClasses=${rootClasses}`,
    `placeholders=${uniquePlaceholders.join(', ') || 'none'}`,
    `htmlPreview=${htmlPreview}`,
  ].join('; ');
};
