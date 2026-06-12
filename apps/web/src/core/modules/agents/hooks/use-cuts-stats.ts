"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CUTS_AGENT_ID = "cuts";

export type CutsAgentStats = {
  totalRuns: number;
  completed: number;
  failed: number;
  running: number;
  avgCreditCost: number;
};

export const cutsStatsQueryKey = ["cuts-stats"] as const;

export const useCutsStats = () =>
  useQuery({
    queryKey: cutsStatsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CutsAgentStats>(
        `/agents/${CUTS_AGENT_ID}/stats`,
      );
      return data;
    },
  });
