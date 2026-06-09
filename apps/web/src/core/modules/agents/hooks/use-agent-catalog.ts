"use client";

import type { AgentCatalog, AgentCatalogItem } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export function useAgentCatalog() {
  return useQuery<AgentCatalog>({
    queryKey: ["agent-catalog"],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentCatalog>("/agents/catalog");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useAgentCatalogItem(agentId: string) {
  return useQuery<AgentCatalogItem & { steps?: Array<{ key: string; label: string; type: string }> }>({
    queryKey: ["agent-catalog", agentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/agents/catalog/${agentId}`);
      return data;
    },
    enabled: Boolean(agentId),
    staleTime: 60_000,
  });
}
