"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type AgentInsights = {
  window: {
    days: number;
    from: string;
    to: string;
  };
  agent: {
    id: string;
    name: string;
    status: "draft" | "active" | "archived";
  };
  summary: {
    totalThreads: number;
    activeThreads: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    responseCoverageRate: number;
    averageMessagesPerThread: number;
    averageAssistantMessageLength: number;
    totalToolCalls: number;
    failedToolCalls: number;
    contextFiles: number;
    contextReferences: number;
    enabledTools: number;
  };
  dailyActivity: Array<{
    date: string;
    threads: number;
    messages: number;
    assistantMessages: number;
  }>;
  toolStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  topTools: Array<{
    toolName: string;
    count: number;
  }>;
};

const agentInsightsKey = (orgId: string, agentId: string) =>
  ["agent-insights", orgId, agentId] as const;

export function useAgentInsights(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: agentInsightsKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentInsights>(
        `/organizations/${orgId}/agents/${agentId}/insights`,
      );
      return data;
    },
  });
}
