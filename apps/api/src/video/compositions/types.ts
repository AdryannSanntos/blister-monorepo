import type { TextStyleSpec } from '@company-os/types';

/** Frame rate every cuts overlay composition renders at. */
export const OVERLAY_FPS = 30;

/** A caption token with millisecond timing (source-clip relative). */
export type OverlayCaption = {
  text: string;
  startMs: number;
  endMs: number;
};

/** Normalized 0–1 anchor for an overlay box center. */
export type OverlayPoint = { x: number; y: number };

/**
 * Props shared by all five text-overlay compositions. The trimmed clip is the
 * background; title and caption layers are burned on top per the chosen style.
 */
export type TextOverlayProps = {
  /** HTTP(S) URL of the trimmed clip used as the background. */
  videoSrc: string;
  width: number;
  height: number;
  durationSec: number;

  addTitle: boolean;
  titleText: string;
  titleStyleSpec: TextStyleSpec | null;
  titlePosition: OverlayPoint;
  titleDurationSec: number;

  addCaptions: boolean;
  captionStyleSpec: TextStyleSpec | null;
  captionPosition: OverlayPoint;
  captions: OverlayCaption[];
};

export const DEFAULT_TEXT_OVERLAY_PROPS: TextOverlayProps = {
  videoSrc: '',
  width: 1080,
  height: 1920,
  durationSec: 30,
  addTitle: false,
  titleText: '',
  titleStyleSpec: null,
  titlePosition: { x: 0.5, y: 0.08 },
  titleDurationSec: 5,
  addCaptions: false,
  captionStyleSpec: null,
  captionPosition: { x: 0.5, y: 0.85 },
  captions: [],
};
