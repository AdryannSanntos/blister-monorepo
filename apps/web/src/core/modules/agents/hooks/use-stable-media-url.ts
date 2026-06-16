"use client";

import { useRef } from "react";

type StableMediaEntry = {
  resourceKey: string;
  url: string;
};

/**
 * Keeps the first resolved media URL per resource key (file id, blob url, etc.).
 * Presigned URLs rotate on refetch — changing `<video src>` reloads the stream.
 */
export const useStableMediaUrl = (
  resourceKey: string | null,
  nextUrl: string | null,
): string | null => {
  const entryRef = useRef<StableMediaEntry | null>(null);

  if (!resourceKey) {
    entryRef.current = null;
    return null;
  }

  if (!nextUrl) {
    return entryRef.current?.resourceKey === resourceKey
      ? entryRef.current.url
      : null;
  }

  if (!entryRef.current || entryRef.current.resourceKey !== resourceKey) {
    entryRef.current = { resourceKey, url: nextUrl };
  }

  return entryRef.current.url;
};
