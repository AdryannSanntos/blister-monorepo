"use client";

import { useEffect, useState } from "react";

type UseSourceVideoDurationParams = {
  localFile: File | null;
  previewUrl: string | null;
};

export const useSourceVideoDuration = ({
  localFile,
  previewUrl,
}: UseSourceVideoDurationParams) => {
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const src = localFile ? URL.createObjectURL(localFile) : previewUrl;
    if (!src) {
      setDurationSec(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setDurationSec(null);

    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      if (localFile) URL.revokeObjectURL(src);
    };

    video.onloadedmetadata = () => {
      if (cancelled) return;
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      setDurationSec(duration);
      setIsLoading(false);
      cleanup();
    };

    video.onerror = () => {
      if (cancelled) return;
      setDurationSec(null);
      setIsLoading(false);
      cleanup();
    };

    video.src = src;

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [localFile, previewUrl]);

  return { durationSec, isLoading };
};
