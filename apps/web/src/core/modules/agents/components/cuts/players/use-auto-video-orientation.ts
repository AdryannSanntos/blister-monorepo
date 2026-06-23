"use client";

import { useMediaPlayer } from "@vidstack/react";
import { useEffect, useState } from "react";

import {
  type ResolvedPlayerOrientation,
  resolvePlayerOrientation,
} from "./player-orientation";

const getPlayerVideoElement = (
  player: ReturnType<typeof useMediaPlayer>,
): HTMLVideoElement | null => {
  const root = player?.el;
  if (!root) return null;
  return root.querySelector("video");
};

export const useAutoVideoOrientation = (src: string): ResolvedPlayerOrientation => {
  const player = useMediaPlayer();
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setVideoSize({ width: 0, height: 0 });

    const video = getPlayerVideoElement(player);
    if (!video) return;

    const syncSize = () => {
      setVideoSize({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.addEventListener("loadedmetadata", syncSize);
    syncSize();

    return () => video.removeEventListener("loadedmetadata", syncSize);
  }, [player, src]);

  return resolvePlayerOrientation("auto", videoSize.width, videoSize.height);
};
