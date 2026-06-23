"use client";

import { useQuery } from "@tanstack/react-query";
import type { AgentSpend } from "@company-os/types";
import { getActiveWorkspaceId } from "src/core/shared/utils/active-workspace";
import { apiClient } from "src/core/shared/utils/api-client";

/** Per-agent credit spend over the last 30 days (DEBIT entries grouped by agent). */
export function useAgentSpend() {
  const workspaceId = getActiveWorkspaceId();

  return useQuery<AgentSpend>({
    queryKey: ["credits", "agent-spend", workspaceId ?? "default"],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentSpend>(
        "/company/credits/agent-spend",
      );
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
