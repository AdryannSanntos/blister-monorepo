"use client";

import {
  MediaPlayer,
  MediaOutlet,
  useMediaStore,
  useMediaRemote,
  useMediaPlayer,
} from "@vidstack/react";
import { Play, Pause } from "lucide-react";
import { useEffect } from "react";
import { cn } from "src/core/shared/utils";

type StoryPlayerProps = {
  src: string | null;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  className?: string;
};

function PlayPauseOverlay() {
  const { paused } = useMediaStore();
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
        paused ? "opacity-100" : "opacity-0 hover:opacity-100",
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
        {paused ? (
          <Play className="size-7 fill-white text-white" />
        ) : (
          <Pause className="size-7 fill-white text-white" />
        )}
      </div>
    </div>
  );
}

function StoryProgressBar({ startSec, endSec }: { startSec: number; endSec: number }) {
  const { currentTime } = useMediaStore();
  const duration = Math.max(1, endSec - startSec);
  const progress = Math.min(100, Math.max(0, ((currentTime - startSec) / duration) * 100));

  return (
    <div className="absolute inset-x-0 top-2 h-0.5 bg-white/20 px-3">
      <div
        className="h-full bg-[var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StoryInner({
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
    <>
      <StoryProgressBar startSec={startSec} endSec={endSec ?? 0} />
      <PlayPauseOverlay />
    </>
  );
}

export function StoryPlayer({ src, cutId, startSec = 0, endSec, className }: StoryPlayerProps) {
  if (!src) return null;

  return (
    <MediaPlayer
      src={src}
      className={cn("relative aspect-[9/16] overflow-hidden rounded-[var(--r-md)]", className)}
      playsInline
    >
      <MediaOutlet />
      <StoryInner src={src} cutId={cutId} startSec={startSec} endSec={endSec} />
    </MediaPlayer>
  );
}
