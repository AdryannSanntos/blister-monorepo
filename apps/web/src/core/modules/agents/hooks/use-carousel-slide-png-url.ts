import { useQuery } from "@tanstack/react-query";

import type { FilePreviewResponse } from "src/core/modules/files/hooks/use-files-api";
import { apiClient } from "src/core/shared/utils/api-client";

/** Refresh before the 24h S3 presigned URL expires. */
const PRESIGNED_STALE_MS = 23 * 60 * 60 * 1000;

export const carouselSlidePngQueryKey = (fileId: string) =>
  ["files", "carousel-slide-png", fileId] as const;

/** Resolves a fresh presigned URL for a rendered carousel slide PNG. */
export const useCarouselSlidePngUrl = (pngFileId: string | null) => {
  return useQuery({
    queryKey: carouselSlidePngQueryKey(pngFileId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<FilePreviewResponse>(
        `/files/${pngFileId}/preview`,
      );
      return data;
    },
    enabled: Boolean(pngFileId),
    staleTime: PRESIGNED_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
