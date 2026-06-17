"use client";

import {
  MediaPlayer,
  MediaOutlet,
  MediaPlayButton,
  MediaMuteButton,
  MediaFullscreenButton,
  MediaTime,
  useMediaStore,
  useMediaRemote,
  useMediaPlayer,
} from "@vidstack/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "src/core/shared/utils";

type MinimalPlayerProps = {
  src: string | null;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  className?: string;
};

function Scrubber({ startSec, endSec }: { startSec: number; endSec: number }) {
  const { currentTime } = useMediaStore();
  const duration = Math.max(1, endSec - startSec);
  const progress = Math.min(100, Math.max(0, ((currentTime - startSec) / duration) * 100));

  return (
    <div
      className="relative h-1 flex-1 cursor-pointer rounded-full bg-[var(--line-subtle)]"
      role="slider"
      aria-label="Progress"
    >
      <div
        className="h-full rounded-full bg-[var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function MinimalInner({
  startSec,
  endSec,
  src,
  cutId,
}: {
  startSec: number;
  endSec?: number;
  src: string;
  cutId: string | null;
}) {
  const player = useMediaPlayer();
  const remote = useMediaRemote();
  const { currentTime } = useMediaStore();

  useEffect(() => {
    if (!player) return;
    remote.seek(startSec);
  }, [src, cutId, startSec]);

  useEffect(() => {
    if (!endSec || currentTime < endSec) return;
    remote.seek(startSec);
    remote.pause();
  }, [currentTime, endSec, startSec]);

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 py-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      {endSec && endSec > startSec ? (
        <Scrubber startSec={startSec} endSec={endSec} />
      ) : null}

      <div className="flex items-center gap-3">
        <MediaPlayButton className="flex size-8 items-center justify-center rounded-full text-white hover:text-[var(--accent)]">
          <Play className="size-5 fill-white text-white" slot="play" />
          <Pause className="size-5 fill-white text-white" slot="pause" />
        </MediaPlayButton>

        <MediaTime type="current" className="text-xs tabular-nums text-white/80" />
        <span className="text-xs text-white/40">/</span>
        <MediaTime type="duration" className="text-xs tabular-nums text-white/60" />

        <div className="ml-auto flex items-center gap-2">
          <MediaMuteButton className="flex size-7 items-center justify-center text-white/70 hover:text-white">
            <Volume2 className="size-4" slot="mute" />
            <VolumeX className="size-4" slot="unmute" />
          </MediaMuteButton>
          <MediaFullscreenButton className="flex size-7 items-center justify-center text-white/70 hover:text-white">
            <Maximize className="size-4" slot="enter" />
            <Minimize className="size-4" slot="exit" />
          </MediaFullscreenButton>
        </div>
      </div>
    </div>
  );
}

export function MinimalPlayer({ src, cutId, startSec = 0, endSec, className }: MinimalPlayerProps) {
  if (!src) return null;

  return (
    <MediaPlayer
      src={src}
      className={cn(
        "group relative overflow-hidden rounded-[var(--r-md)] bg-black",
        className,
      )}
      playsInline
    >
      <MediaOutlet />
      <MinimalInner src={src} cutId={cutId} startSec={startSec} endSec={endSec} />
    </MediaPlayer>
  );
}
