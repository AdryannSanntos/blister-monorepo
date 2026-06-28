"use client";

import { useMemo } from "react";
import { CAROUSEL_RUNS_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";

export const useCarouselRuns = () => {
  return useMemo(() => ({
    data: { runs: CAROUSEL_RUNS_FIXTURE, total: CAROUSEL_RUNS_FIXTURE.length },
    isLoading: false,
  }), []);
};

export const useCarouselOverviewStats = () => {
  return useMemo(() => ({
    totalRuns: CAROUSEL_RUNS_FIXTURE.length,
    completedRuns: CAROUSEL_RUNS_FIXTURE.filter((r) => r.status === "completed").length,
    approvedRuns: CAROUSEL_RUNS_FIXTURE.filter((r) => r.status === "completed").length,
    creditsUsed: CAROUSEL_RUNS_FIXTURE.reduce((s, r) => s + (r.creditsUsed ?? 0), 0),
  }), []);
};
