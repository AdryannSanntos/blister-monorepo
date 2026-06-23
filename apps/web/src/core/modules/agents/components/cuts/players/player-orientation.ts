export type PlayerOrientation = "auto" | "vertical" | "horizontal";

export type ResolvedPlayerOrientation = "vertical" | "horizontal";

export const resolvePlayerOrientation = (
  orientation: PlayerOrientation,
  videoWidth: number,
  videoHeight: number,
): ResolvedPlayerOrientation => {
  if (orientation === "vertical") return "vertical";
  if (orientation === "horizontal") return "horizontal";
  if (videoWidth <= 0 || videoHeight <= 0) return "vertical";
  return videoWidth >= videoHeight ? "horizontal" : "vertical";
};

export const playerAspectClassName = (
  orientation: ResolvedPlayerOrientation,
): string =>
  orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";

export const playerFrameClassName = (
  orientation: ResolvedPlayerOrientation,
): string =>
  orientation === "vertical"
    ? "relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-lg)]"
    : "relative aspect-video w-full max-w-full overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-lg)]";
