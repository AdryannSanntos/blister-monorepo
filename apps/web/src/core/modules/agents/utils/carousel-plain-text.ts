/** Strips HTML for display of carousel copy (defense-in-depth for legacy runs). */
export const toCarouselDisplayText = (value: string | undefined): string | undefined => {
  if (!value) return value;

  const withoutTags = value.replace(/<[^>]*>/g, '');
  const lines = withoutTags
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return undefined;
  return lines.join('\n');
};
