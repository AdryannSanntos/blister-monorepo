"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CUTS_AGENT_ID = "cuts";

type RunsResponse = {
  runs: AgentRunStatusDto[];
  total: number;
};

export const cutsRunsQueryKey = (reviewStatus?: "pending") =>
  ["cuts-runs", reviewStatus ?? "all"] as const;

export const useCutsRuns = (options?: { reviewStatus?: "pending"; limit?: number }) =>
  useQuery({
    queryKey: cutsRunsQueryKey(options?.reviewStatus),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.reviewStatus) params.set("reviewStatus", options.reviewStatus);
      const query = params.toString();
      const { data } = await apiClient.get<RunsResponse>(
        `/agents/${CUTS_AGENT_ID}/runs${query ? `?${query}` : ""}`,
      );
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useCutsPendingCount = () => {
  const query = useCutsRuns({ reviewStatus: "pending", limit: 1 });
  return {
    ...query,
    pendingCount: query.data?.total ?? 0,
  };
};
