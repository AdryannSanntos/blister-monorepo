"use client";

import { useMediaPlayer } from "@vidstack/react";
import { useEffect } from "react";

import {
  type ResolvedPlayerOrientation,
  resolvePlayerOrientation,
} from "./player-orientation";
import { useAutoVideoOrientation } from "./use-auto-video-orientation";

export const playerAspectStyle = (
  orientation: ResolvedPlayerOrientation,
): { aspectRatio: string } => ({
  aspectRatio: orientation === "vertical" ? "9 / 16" : "16 / 9",
});

export function AutoAspectUpdater({ src }: { src: string }) {
  const player = useMediaPlayer();
  const orientation = useAutoVideoOrientation(src);

  useEffect(() => {
    const root = player?.el;
    if (!root) return;
    root.style.aspectRatio = playerAspectStyle(orientation).aspectRatio;
  }, [orientation, player]);

  return null;
}

export const resolveForcedOrientation = (
  orientation: "vertical" | "horizontal",
): ResolvedPlayerOrientation => resolvePlayerOrientation(orientation, 0, 0);
