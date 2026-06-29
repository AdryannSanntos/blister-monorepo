"use client";

import {
  agentWorkspaceSettingsResponseSchema,
  carouselAgentSettingsSchema,
  type CarouselAgentSettings,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CAROUSEL_AGENT_ID = "carousel";

export const carouselSettingsQueryKey = ["carousel-settings"] as const;

export const useCarouselSettings = () =>
  useQuery({
    queryKey: carouselSettingsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/workspace-settings/agents/${CAROUSEL_AGENT_ID}`,
      );
      const parsed = agentWorkspaceSettingsResponseSchema.parse(data);
      return carouselAgentSettingsSchema.parse(parsed.config);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

export const useUpdateCarouselSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CarouselAgentSettings) => {
      const parsed = carouselAgentSettingsSchema.parse(config);
      const { data } = await apiClient.patch(
        `/workspace-settings/agents/${CAROUSEL_AGENT_ID}`,
        { config: parsed },
      );
      return carouselAgentSettingsSchema.parse(
        agentWorkspaceSettingsResponseSchema.parse(data).config,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carouselSettingsQueryKey });
    },
  });
};
