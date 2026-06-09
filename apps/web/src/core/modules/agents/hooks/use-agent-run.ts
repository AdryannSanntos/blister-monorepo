"use client";

import type { AgentRunBlockDto, AgentRunStatusDto, AgentRunStepDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

import type { ChatBlockState } from "../utils/agent-block-reducer";

export type AgentRunWithSteps = {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
  blocks: AgentRunBlockDto[];
  /** Live block timeline reduced from SSE while the run is active. */
  blockChatState?: ChatBlockState;
};

export function useAgentRun(runId: string | null) {
  return useQuery<AgentRunWithSteps>({
    queryKey: ["agent-run", runId],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRunWithSteps>(
        `/agents/runs/${runId}`,
      );
      return {
        ...data,
        blocks: data.blocks ?? [],
      };
    },
    enabled: Boolean(runId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
