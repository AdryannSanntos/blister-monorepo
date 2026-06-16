"use client";

import type { AgentRunBlockDto, AgentRunStatusDto, AgentRunStepDto } from "@company-os/types";
import { useQuery, type Query } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

import type { ChatBlockState } from "../utils/agent-block-reducer";
import { runPollIntervalMs } from "../utils/run-poll-interval";

export type AgentRunWithSteps = {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
  blocks: AgentRunBlockDto[];
  /** Live block timeline reduced from SSE while the run is active. */
  blockChatState?: ChatBlockState;
};

export type UseAgentRunOptions = {
  refetchInterval?:
    | number
    | false
    | ((query: Query<AgentRunWithSteps>) => number | false);
};

export function useAgentRun(
  runId: string | null,
  options?: UseAgentRunOptions,
) {
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
    // SSE drives live updates; this polls as a fallback so an in-flight run
    // still resolves if the stream never connects or drops mid-run.
    refetchInterval:
      options?.refetchInterval ??
      ((query) => runPollIntervalMs(query.state.data?.run.status)),
  });
}
