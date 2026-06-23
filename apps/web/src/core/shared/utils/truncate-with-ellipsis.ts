const ELLIPSIS = "...";

/**
 * Shortens text to `maxChars`, reserving three characters for "..." when truncated.
 */
export const truncateWithEllipsis = (value: string, maxChars: number): string => {
  if (maxChars <= ELLIPSIS.length) {
    return value.length <= maxChars ? value : ELLIPSIS.slice(0, maxChars);
  }

  if (value.length <= maxChars) return value;

  return `${value.slice(0, maxChars - ELLIPSIS.length)}${ELLIPSIS}`;
};

/** Default max length for filenames in compact UI surfaces (modals, tables). */
export const DISPLAY_FILENAME_MAX_CHARS = 56;
