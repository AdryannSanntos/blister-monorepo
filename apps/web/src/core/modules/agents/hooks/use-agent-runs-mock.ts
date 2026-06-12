"use client";

import { useMemo } from "react";

import type { AgentRunFixture } from "src/core/modules/blister-os/fixtures/agent-runs.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";

export type AgentUsageDay = {
  label: string;
  count: number;
};

const DAY_MS = 86_400_000;

const formatDayLabel = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);

export const useAgentRunsMock = (agentId: string) => {
  const allRuns = useBlisterOsStore((state) => state.agentRuns);
  const runs = useMemo(
    () => allRuns.filter((run) => run.agentId === agentId),
    [allRuns, agentId],
  );

  return useMemo(() => ({ runs }), [runs]);
};

export const useAgentStatsMock = (agentId: string, locale: string) => {
  const allRuns = useBlisterOsStore((state) => state.agentRuns);
  const runs = useMemo(
    () => allRuns.filter((run) => run.agentId === agentId),
    [allRuns, agentId],
  );

  return useMemo(() => {
    const completed = runs.filter((run) => run.status === "completed");
    const approved = runs.filter((run) => run.reviewStatus === "approved");
    const creditsUsed = runs.reduce(
      (total, run) => total + (run.creditsUsed ?? 0),
      0,
    );

    const usageByDay: AgentUsageDay[] = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - (6 - index));

      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      const count = runs.filter((run) => {
        const created = new Date(run.createdAt).getTime();
        return created >= dayStart.getTime() && created < dayEnd.getTime();
      }).length;

      return {
        label: formatDayLabel(dayStart, locale),
        count,
      };
    });

    return {
      totalRuns: runs.length,
      completedRuns: completed.length,
      approvedRuns: approved.length,
      creditsUsed,
      usageByDay,
    };
  }, [agentId, locale, runs]);
};

export type AddAgentRunInput = Omit<AgentRunFixture, "id" | "createdAt"> & {
  createdAt?: string;
};
