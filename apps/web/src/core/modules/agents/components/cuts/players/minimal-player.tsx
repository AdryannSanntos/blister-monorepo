"use client";

import type { MediaPlayerInstance } from "@vidstack/react";
import type { Ref } from "react";

import { CutMediaPlayer } from "./cut-media-player";
import type { PlayerOrientation } from "./player-orientation";

type MinimalPlayerProps = {
  src: string | null;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  orientation?: PlayerOrientation;
  className?: string;
  playerRef?: Ref<MediaPlayerInstance>;
  /** Fires on playback progress with the current time in seconds. */
  onTimeUpdate?: (currentTimeSec: number) => void;
};

export function MinimalPlayer({
  src,
  cutId,
  startSec = 0,
  endSec,
  orientation = "auto",
  className,
  playerRef,
  onTimeUpdate,
}: MinimalPlayerProps) {
  if (!src) return null;

  return (
    <CutMediaPlayer
      src={src}
      cutId={cutId}
      startSec={startSec}
      endSec={endSec}
      orientation={orientation}
      variant="minimal"
      className={className}
      playerRef={playerRef}
      onTimeUpdate={onTimeUpdate}
    />
  );
}
