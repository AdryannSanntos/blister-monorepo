"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "src/core/shared/utils/api-client";

import { isCarouselProcessingRun } from "../utils/carousel-run-display";
import { OVERVIEW_ACTIVE_RUNS_POLL_MS } from "../utils/run-poll-interval";

const CAROUSEL_AGENT_ID = "carousel";

type RunsResponse = {
  runs: AgentRunStatusDto[];
  total: number;
};

export const carouselRunsQueryKey = (reviewStatus?: "pending") =>
  ["carousel-runs", reviewStatus ?? "all"] as const;

export const useCarouselRuns = (options?: {
  reviewStatus?: "pending";
  limit?: number;
  pollWhileProcessing?: boolean;
}) =>
  useQuery({
    queryKey: carouselRunsQueryKey(options?.reviewStatus),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.reviewStatus) params.set("reviewStatus", options.reviewStatus);
      const query = params.toString();
      const { data } = await apiClient.get<RunsResponse>(
        `/agents/${CAROUSEL_AGENT_ID}/runs${query ? `?${query}` : ""}`,
      );
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (!options?.pollWhileProcessing) return false;
      const runs = query.state.data?.runs ?? [];
      return runs.some(isCarouselProcessingRun)
        ? OVERVIEW_ACTIVE_RUNS_POLL_MS
        : false;
    },
  });

export const useCarouselOverviewStats = () => {
  const runsQuery = useCarouselRuns({ limit: 50, pollWhileProcessing: true });

  return useMemo(() => {
    const runs = runsQuery.data?.runs ?? [];
    const completedRuns = runs.filter((run) => run.status === "COMPLETED").length;
    const approvedRuns = runs.filter(
      (run) => run.reviewStatus === "APPROVED" || run.status === "COMPLETED",
    ).length;
    const creditsUsed = runs.reduce(
      (total, run) => total + (run.creditCost ?? 0),
      0,
    );

    return {
      totalRuns: runsQuery.data?.total ?? runs.length,
      completedRuns,
      approvedRuns,
      creditsUsed,
      isLoading: runsQuery.isLoading,
    };
  }, [runsQuery.data, runsQuery.isLoading]);
};
