"use client";

import type { AgentRunStatusDto, AgentRunStepDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

import { isRunActive } from "../utils/agent-run-helpers";

export type AgentRunWithSteps = {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
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
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status && isRunActive(status) ? 2000 : false;
    },
  });
}
