"use client";

import {
  Controls,
  FullscreenButton,
  MuteButton,
  PlayButton,
  Time,
  useMediaRemote,
  useMediaState,
} from "@vidstack/react";
import type { MouseEvent } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "src/core/shared/utils";

import { CutPlayerScrubber } from "./cut-player-scrubber";

export type CutPlayerVariant = "minimal" | "story";

const controlsBarClassName = (variant: CutPlayerVariant) =>
  cn(
    "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 data-[visible]:pointer-events-auto data-[visible]:opacity-100",
    variant === "story" && "pt-10",
  );

/** Click/tap on the video area toggles play/pause; controls (z-20) stay above this layer. */
export const CutPlayerToggleGesture = () => {
  const remote = useMediaRemote();

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    remote.togglePaused(event.nativeEvent);
  };

  return (
    <div
      className="cut-player-toggle-layer absolute inset-0 z-[5] cursor-pointer pointer-events-auto"
      onClick={handleClick}
      aria-hidden
    />
  );
};

type CutPlayerCenterOverlayProps = {
  variant?: CutPlayerVariant;
};

/** Brief play/pause affordance over the video. */
export const CutPlayerCenterOverlay = ({
  variant = "minimal",
}: CutPlayerCenterOverlayProps) => {
  const paused = useMediaState("paused");

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] flex items-center justify-center transition-opacity duration-150",
        paused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        variant === "story" ? "group-data-[playing]:opacity-0" : "",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-black/45 backdrop-blur-sm",
          variant === "story" ? "size-14" : "size-12",
        )}
      >
        {paused ? (
          <Play
            className={cn(
              "fill-white text-white",
              variant === "story" ? "size-7" : "size-6",
            )}
          />
        ) : (
          <Pause
            className={cn(
              "fill-white text-white",
              variant === "story" ? "size-7" : "size-6",
            )}
          />
        )}
      </div>
    </div>
  );
};

type CutPlayerControlsBarProps = {
  variant?: CutPlayerVariant;
};

/**
 * Bottom control bar. Media state hooks live here (direct MediaPlayer child) —
 * do not call useMediaState inside PlayButton/MuteButton children (causes Maverick TypeError).
 */
export const CutPlayerControlsBar = ({
  variant = "minimal",
}: CutPlayerControlsBarProps) => {
  const paused = useMediaState("paused");
  const muted = useMediaState("muted");
  const volume = useMediaState("volume");
  const isFullscreen = useMediaState("fullscreen");

  return (
    <Controls.Root className={controlsBarClassName(variant)}>
      <CutPlayerScrubber />

      <Controls.Group className="pointer-events-auto flex items-center gap-2.5">
        <PlayButton
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-full)] text-white transition-colors hover:text-[var(--accent)]"
          aria-label="Play"
        >
          {paused ? (
            <Play className="size-5 fill-white text-white" />
          ) : (
            <Pause className="size-5 fill-white text-white" />
          )}
        </PlayButton>

        <Time
          type="current"
          className="min-w-[2.5rem] text-xs tabular-nums text-white/85"
        />
        <span className="text-xs text-white/40">/</span>
        <Time
          type="duration"
          className="min-w-[2.5rem] text-xs tabular-nums text-white/65"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <MuteButton
            className="flex size-8 items-center justify-center rounded-[var(--r-full)] text-white/75 transition-colors hover:text-white"
            aria-label="Mute"
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </MuteButton>
          <FullscreenButton
            className="flex size-8 items-center justify-center rounded-[var(--r-full)] text-white/75 transition-colors hover:text-white"
            aria-label="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </FullscreenButton>
        </div>
      </Controls.Group>
    </Controls.Root>
  );
};
