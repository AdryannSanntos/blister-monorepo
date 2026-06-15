import type { CutOutput } from "@company-os/types";

/** Ensures each cut has a stable, unique id (`cut-1`, `cut-2`, …). */
export const withStableCutIds = (cuts: CutOutput[]): CutOutput[] =>
  cuts.map((cut, index) => {
    const id = `cut-${index + 1}`;
    return cut.id === id ? cut : { ...cut, id };
  });

export const formatCutDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const formatCutWindow = (startSec: number, endSec: number) =>
  `${formatCutDuration(startSec)} – ${formatCutDuration(endSec)}`;

/**
 * Whether to render a video thumbnail for a cut in the review grid.
 *
 * Rendered clips (their own `cutFileId`) always show a thumbnail — each has a
 * lightweight standalone file. Cuts without a rendered clip fall back to the
 * shared source video, which is only worth loading for the selected cut.
 */
export const shouldShowCutThumbnail = (params: {
  hasVideoSrc: boolean;
  usesRenderedClip: boolean;
  selected: boolean;
}): boolean =>
  params.hasVideoSrc && (params.usesRenderedClip || params.selected);
