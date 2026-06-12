"use client";

import {
  agentWorkspaceSettingsResponseSchema,
  cutsAgentSettingsSchema,
  type CutsAgentSettings,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CUTS_AGENT_ID = "cuts";

export const cutsSettingsQueryKey = ["cuts-settings"] as const;

export const useCutsSettings = () =>
  useQuery({
    queryKey: cutsSettingsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get(`/workspace-settings/agents/${CUTS_AGENT_ID}`);
      return agentWorkspaceSettingsResponseSchema.parse(data).config;
    },
  });

export const useUpdateCutsSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CutsAgentSettings) => {
      const parsed = cutsAgentSettingsSchema.parse(config);
      const { data } = await apiClient.patch(
        `/workspace-settings/agents/${CUTS_AGENT_ID}`,
        { config: parsed },
      );
      return agentWorkspaceSettingsResponseSchema.parse(data).config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cutsSettingsQueryKey });
    },
  });
};
