"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CAROUSEL_AGENT_ID = "carousel";

export type CarouselAgentStats = {
  totalRuns: number;
  completed: number;
  failed: number;
  running: number;
  avgCreditCost: number;
};

export const carouselStatsQueryKey = ["carousel-stats"] as const;

export const useCarouselStats = () =>
  useQuery({
    queryKey: carouselStatsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<CarouselAgentStats>(
        `/agents/${CAROUSEL_AGENT_ID}/stats`,
      );
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
