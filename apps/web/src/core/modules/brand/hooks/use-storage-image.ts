"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export function useStorageImageUrl(storageKey: string | null | undefined) {
  return useQuery({
    queryKey: ["storage-image", storageKey],
    queryFn: async () => {
      const { data } = await apiClient.get<{ url: string }>(
        "/storage/presigned-download",
        { params: { key: storageKey } },
      );
      return data.url;
    },
    enabled: Boolean(storageKey),
    staleTime: 30 * 60 * 1000,
  });
}
