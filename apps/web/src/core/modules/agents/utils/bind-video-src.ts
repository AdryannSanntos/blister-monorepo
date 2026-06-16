/**
 * Binds a media URL to a `<video>` element without redundant reloads.
 * Uses a caller-owned ref — never `getAttribute("src")`, which can disagree with `video.src`.
 */
export const bindVideoSrc = (
  video: HTMLVideoElement,
  nextUrl: string | null,
  boundUrlRef: { current: string | null },
): void => {
  if (boundUrlRef.current === nextUrl) return;

  boundUrlRef.current = nextUrl;

  if (!nextUrl) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    return;
  }

  video.pause();
  video.src = nextUrl;
};
