"use client";

import { useMemo } from "react";

import { filterViewableRuns } from "src/core/modules/agents/utils/cuts-viewable-runs";
import { useCutsRuns } from "./use-cuts-runs";
import { useCutsStats } from "./use-cuts-stats";

export const useCutsOverview = () => {
  const runsQuery = useCutsRuns({ limit: 50, pollWhileProcessing: true });
  const statsQuery = useCutsStats();

  const runs = runsQuery.data?.runs ?? [];

  return useMemo(() => {
    const approvedRuns = runs.filter(
      (run) => run.reviewStatus === "APPROVED" || run.status === "COMPLETED",
    ).length;

    const creditsUsed = runs.reduce(
      (total, run) => total + (run.creditCost ?? 0),
      0,
    );

    const viewableRuns = filterViewableRuns(runs);

    return {
      isLoading: runsQuery.isLoading || statsQuery.isLoading,
      stats: {
        totalRuns: statsQuery.data?.totalRuns ?? runs.length,
        completedRuns: statsQuery.data?.completed ?? 0,
        approvedRuns,
        creditsUsed,
      },
      viewableRuns,
    };
  }, [runs, runsQuery.isLoading, statsQuery.data, statsQuery.isLoading]);
};
