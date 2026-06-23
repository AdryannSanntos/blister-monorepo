"use client";

import {
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
} from "@vidstack/react";
import type { Ref } from "react";
import { cn } from "src/core/shared/utils";
import {
  AutoAspectUpdater,
  resolveForcedOrientation,
} from "./player-aspect-updater";
import {
  CutPlayerCenterOverlay,
  CutPlayerControlsBar,
  CutPlayerToggleGesture,
  type CutPlayerVariant,
} from "./cut-player-controls";
import type { PlayerOrientation } from "./player-orientation";

export type CutMediaPlayerProps = {
  src: string;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  orientation?: PlayerOrientation;
  variant?: CutPlayerVariant;
  className?: string;
  playerRef?: Ref<MediaPlayerInstance>;
  loop?: boolean;
  onTimeUpdate?: (currentTimeSec: number) => void;
};

const resolveAspectRatio = (orientation: PlayerOrientation): string => {
  if (orientation === "auto") return "9 / 16";
  return resolveForcedOrientation(orientation) === "vertical"
    ? "9 / 16"
    : "16 / 9";
};

/** Shared cuts media shell — gesture, overlays, and controls wired once for all variants. */
export const CutMediaPlayer = ({
  src,
  cutId,
  startSec = 0,
  endSec,
  orientation = "auto",
  variant = "minimal",
  className,
  playerRef,
  loop = false,
  onTimeUpdate,
}: CutMediaPlayerProps) => {
  const hasClip = endSec != null && endSec > startSec;

  return (
    <MediaPlayer
      key={cutId ?? "cut"}
      ref={playerRef}
      src={src}
      load="visible"
      className={cn(
        "cuts-media-player group relative block size-full cursor-pointer overflow-hidden rounded-[var(--r-md)] bg-black",
        className,
      )}
      style={{ aspectRatio: resolveAspectRatio(orientation) }}
      playsInline
      controlsDelay={3000}
      loop={loop}
      onTimeUpdate={
        onTimeUpdate ? (detail) => onTimeUpdate(detail.currentTime) : undefined
      }
      {...(hasClip ? { clipStartTime: startSec, clipEndTime: endSec } : {})}
    >
      <MediaProvider />
      {orientation === "auto" ? <AutoAspectUpdater src={src} /> : null}

      <CutPlayerToggleGesture />
      <CutPlayerCenterOverlay variant={variant} />
      <CutPlayerControlsBar variant={variant} />
    </MediaPlayer>
  );
};
