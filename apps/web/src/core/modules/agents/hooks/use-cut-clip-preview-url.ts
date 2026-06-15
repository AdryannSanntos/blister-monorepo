"use client";

import type { CutOutput } from "@company-os/types";

import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";

/** Resolves a presigned URL for a rendered cut clip when cutFileId is available. */
export const useCutClipPreviewUrl = (
  cut: CutOutput | null,
  enabled = true,
) => {
  const fileId = cut?.cutFileId ?? null;
  return useFilePreviewUrl(fileId, enabled && Boolean(fileId));
};
