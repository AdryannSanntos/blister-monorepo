/** Progress fill percentage for the cut player scrubber (0–100). */
export const scrubberProgressPercent = (
  currentTime: number,
  duration: number,
): number => {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (currentTime / duration) * 100));
};

/** Maps a horizontal pointer position to a seek time in seconds. */
export const scrubberSeekTime = (
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  duration: number,
): number => {
  if (rect.width <= 0 || duration <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return ratio * duration;
};
