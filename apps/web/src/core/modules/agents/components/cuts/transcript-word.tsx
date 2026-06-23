"use client";

import { memo } from "react";

import { cn } from "src/core/shared/utils";

type TranscriptWordProps = {
  text: string;
  startSec: number;
  /** The word currently being spoken. */
  isActive: boolean;
  /** A word already spoken within the active line. */
  isSpoken: boolean;
  onSeek: (sourceSec: number) => void;
};

/**
 * A single clickable transcript word. Clicking seeks the player to the word's
 * exact start. The active word is tinted; transitions are near-instant so the
 * highlight tracks the audio without feeling laggy.
 */
export const TranscriptWord = memo(function TranscriptWord({
  text,
  startSec,
  isActive,
  isSpoken,
  onSeek,
}: TranscriptWordProps) {
  return (
    <button
      type="button"
      data-active={isActive || undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSeek(startSec);
      }}
      className={cn(
        "cursor-pointer rounded-[3px] px-0.5 underline-offset-2 transition-colors duration-[60ms] ease-[var(--ease-out)] hover:underline",
        isActive
          ? "bg-[var(--accent-soft)] text-[var(--accent-soft-text)]"
          : isSpoken
            ? "text-[var(--fg-primary)]"
            : "text-[var(--fg-secondary)]",
      )}
    >
      {text}
    </button>
  );
});
