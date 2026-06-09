"use client";

import type { AgentRunStatusDto, AgentRunStepDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type AgentRunWithSteps = {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
  /**
   * Accumulated text streamed via `output_chunk` SSE events while the run is
   * active. Transient client-only state — not persisted on the server.
   */
  streamingText?: string;
};

export function useAgentRun(runId: string | null) {
  return useQuery<AgentRunWithSteps>({
    queryKey: ["agent-run", runId],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRunWithSteps>(
        `/agents/runs/${runId}`,
      );
      return data;
    },
    enabled: Boolean(runId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
