"use client";

import type { CutsTranscriptSegment } from "@company-os/types";

import { formatCutDuration } from "src/core/modules/agents/utils/cuts-display";
import { cn } from "src/core/shared/utils";

type TranscriptProgressBarProps = {
  segments: CutsTranscriptSegment[];
  /** Cut bounds in source-video seconds. */
  startSec: number;
  endSec: number;
  /** Current playback position in source-video seconds. */
  currentSourceSec: number;
  onSeek: (sourceSec: number) => void;
  className?: string;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * A thin video-progress line with a marker per transcript line. Visually ties
 * the player to the transcript: the playhead shows position, markers show
 * where the spoken blocks are. Clicking (or arrowing) seeks to that point.
 */
export const TranscriptProgressBar = ({
  segments,
  startSec,
  endSec,
  currentSourceSec,
  onSeek,
  className,
}: TranscriptProgressBarProps) => {
  const duration = Math.max(0.001, endSec - startSec);
  const progress = clamp01((currentSourceSec - startSec) / duration);

  return (
    <button
      type="button"
      aria-label="Seek"
      onClick={(event) => {
        // Ignore keyboard-triggered clicks (no pointer position).
        if (event.detail === 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = clamp01((event.clientX - rect.left) / rect.width);
        onSeek(startSec + ratio * duration);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onSeek(Math.max(startSec, currentSourceSec - 2));
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onSeek(Math.min(endSec, currentSourceSec + 2));
        }
      }}
      className={cn(
        "group relative block h-3 w-full cursor-pointer outline-none",
        className,
      )}
    >
      {/* Track */}
      <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-[var(--r-full)] bg-[var(--line-default)]" />
      {/* Fill */}
      <span
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-[var(--r-full)] bg-[var(--accent)] transition-[width] duration-[var(--dur-fast)] ease-linear"
        style={{ width: `${progress * 100}%` }}
      />
      {/* Segment markers (decorative — proportional seek lands on them). */}
      {segments.map((segment, index) => {
        const left = clamp01((segment.startSec - startSec) / duration) * 100;
        const relative = Math.max(0, segment.startSec - startSec);
        return (
          <span
            key={segment.id ?? `${segment.startSec}-${index}`}
            title={formatCutDuration(relative)}
            aria-hidden
            className="absolute top-1/2 h-[7px] w-px -translate-y-1/2 bg-[var(--fg-quaternary)] opacity-50"
            style={{ left: `${left}%` }}
          />
        );
      })}
      {/* Playhead */}
      <span
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-full)] bg-[var(--accent)] opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100"
        style={{ left: `${progress * 100}%` }}
      />
    </button>
  );
};
