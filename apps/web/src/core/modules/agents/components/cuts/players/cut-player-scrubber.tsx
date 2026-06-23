"use client";

import { useMediaRemote, useMediaState } from "@vidstack/react";
import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "src/core/shared/utils";

import {
  scrubberProgressPercent,
  scrubberSeekTime,
} from "./scrubber-progress";

/** Interactive progress scrubber — uses media remote seek (no Vidstack TimeSlider). */
export const CutPlayerScrubber = () => {
  const currentTime = useMediaState("currentTime");
  const duration = useMediaState("duration");
  const remote = useMediaRemote();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const safeDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = scrubberProgressPercent(currentTime, safeDuration);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || safeDuration <= 0) return;
      const time = scrubberSeekTime(clientX, track.getBoundingClientRect(), safeDuration);
      remote.seek(time);
    },
    [remote, safeDuration],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromClientX(event.clientX);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (safeDuration <= 0) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      remote.seek(Math.max(0, currentTime - 5));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      remote.seek(Math.min(safeDuration, currentTime + 5));
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={safeDuration}
      aria-valuenow={currentTime}
      tabIndex={0}
      className={cn(
        "relative z-20 mx-0.5 flex h-5 w-full cursor-pointer touch-none select-none items-center outline-none pointer-events-auto",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      <div className="relative h-1 w-full rounded-[var(--r-full)] bg-white/25">
        <div
          className="absolute h-full rounded-[var(--r-full)] bg-white/40"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute h-full rounded-[var(--r-full)] bg-[var(--accent)]"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-full)] bg-white shadow-[var(--shadow-sm)] ring-2 ring-white/30"
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
};
