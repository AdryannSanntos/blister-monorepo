"use client";

import { useRef } from "react";

type PlaybackEntry = {
  cutId: string;
  src: string;
};

/**
 * Keeps a non-empty media URL for the active cut while presigned URLs refresh or
 * the player switches from source preview to rendered clip. Vidstack crashes if
 * `src` is cleared while the internal Maverick store is still tearing down.
 */
export const useStablePlaybackSrc = (
  cutId: string | null,
  nextSrc: string | null,
): string | null => {
  const entryRef = useRef<PlaybackEntry | null>(null);

  if (!cutId) {
    entryRef.current = null;
    return null;
  }

  if (nextSrc) {
    entryRef.current = { cutId, src: nextSrc };
    return nextSrc;
  }

  if (entryRef.current?.cutId === cutId) {
    return entryRef.current.src;
  }

  return null;
};
