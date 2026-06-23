"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RagPlatformSettings, UpdateRagSettingsDto } from "@company-os/types";

import { apiClient } from "src/core/shared/utils/api-client";

import { usePlatformSettings } from "./use-platform-settings";

/**
 * Reads the platform RAG settings. Shares the `["platform","settings"]` cache
 * with `usePlatformSettings` so credits + RAG stay coherent.
 */
export function useRagSettings() {
  const query = usePlatformSettings();
  return { ...query, data: query.data?.rag ?? null };
}

export function useUpdateRagSettings() {
  const queryClient = useQueryClient();

  return useMutation<RagPlatformSettings, Error, UpdateRagSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<RagPlatformSettings>(
        "/platform/settings/rag",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] }),
  });
}
