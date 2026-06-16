/** Strips an existing media-fragment hash from a preview URL. */
export const stripMediaFragment = (url: string): string => url.split("#")[0] ?? url;

/**
 * Builds a Media Fragments URI for in-source segment preview.
 * The hash is not sent to the server, so presigned query params stay valid.
 */
export const buildSegmentMediaSrc = (
  baseUrl: string,
  startSec: number,
  endSec: number,
): string => {
  const base = stripMediaFragment(baseUrl);
  const start = Math.max(0, Number(startSec.toFixed(3)));
  const end = Math.max(start + 0.5, Number(endSec.toFixed(3)));
  return `${base}#t=${start},${end}`;
};
