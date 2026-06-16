"use client";

import { useEffect, useRef } from "react";

const SEEK_EPSILON_SEC = 0.25;

type UseCutSegmentVideoParams = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  cutId: string | null;
  startSec: number;
  endSec: number;
};

const isValidSegment = (startSec: number, endSec: number) =>
  Number.isFinite(startSec) &&
  Number.isFinite(endSec) &&
  endSec > startSec + 0.5;

/**
 * Loops the active segment window while the user is playing.
 * Initial seek is handled via Media Fragments on `src` — no programmatic seek on load.
 */
export const useCutSegmentVideo = ({
  videoRef,
  enabled,
  cutId,
  startSec,
  endSec,
}: UseCutSegmentVideoParams) => {
  const loopRafRef = useRef<number | null>(null);

  const segmentValid = isValidSegment(startSec, endSec);
  const active = enabled && Boolean(cutId) && segmentValid;

  useEffect(() => {
    if (!active) return;

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.paused) return;
      if (loopRafRef.current !== null) return;
      if (video.currentTime < endSec - 0.05) return;

      loopRafRef.current = window.requestAnimationFrame(() => {
        loopRafRef.current = null;

        if (video.paused) return;
        if (Math.abs(video.currentTime - startSec) > SEEK_EPSILON_SEC) {
          try {
            video.currentTime = startSec;
          } catch {
            /* ignore */
          }
        }
      });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      if (loopRafRef.current !== null) {
        window.cancelAnimationFrame(loopRafRef.current);
        loopRafRef.current = null;
      }
    };
  }, [active, cutId, startSec, endSec, videoRef]);
};
