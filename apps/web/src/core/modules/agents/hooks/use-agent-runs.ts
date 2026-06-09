"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

import { isRunActive } from "../utils/agent-run-helpers";

type AgentRunsResponse = {
  runs: AgentRunStatusDto[];
  total: number;
};

export function useAgentRuns(agentId: string, options?: { limit?: number }) {
  return useQuery<AgentRunsResponse>({
    queryKey: ["agent-runs", agentId, options?.limit ?? 20],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRunsResponse>(
        `/agents/${agentId}/runs`,
        { params: { limit: options?.limit ?? 20, offset: 0 } },
      );
      return data;
    },
    enabled: Boolean(agentId),
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      const hasActive = runs.some((run) => isRunActive(run.status));
      return hasActive ? 3000 : false;
    },
  });
}

export function useAllAgentRuns(agentIds: string[]) {
  return useQuery<AgentRunStatusDto[]>({
    queryKey: ["all-agent-runs", agentIds],
    queryFn: async () => {
      const responses = await Promise.all(
        agentIds.map(async (agentId) => {
          const { data } = await apiClient.get<AgentRunsResponse>(
            `/agents/${agentId}/runs`,
            { params: { limit: 10, offset: 0 } },
          );
          return data.runs;
        }),
      );

      return responses
        .flat()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    },
    enabled: agentIds.length > 0,
    staleTime: 30_000,
  });
}
