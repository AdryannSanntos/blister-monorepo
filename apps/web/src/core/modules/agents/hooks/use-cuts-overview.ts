"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { useMemo } from "react";

import type { AgentUsageDay } from "./use-agent-runs-mock";
import { useCutsRuns } from "./use-cuts-runs";
import { useCutsStats } from "./use-cuts-stats";

const DAY_MS = 86_400_000;

const formatDayLabel = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);

const formatRunTitle = (run: AgentRunStatusDto) => {
  const input = run.inputPayload as { userInput?: string; sourceFileId?: string };
  return input.userInput?.trim() || `Execução ${run.id.slice(0, 8)}`;
};

const formatRunPreview = (run: AgentRunStatusDto) => {
  const cuts = run.outputPayload?.cuts as Array<{ title?: string }> | undefined;
  if (run.status === "RUNNING" || run.status === "QUEUED") {
    return "Analisando segmentos...";
  }
  if (run.status === "PAUSED") {
    return "Aguardando validação dos cortes";
  }
  if (run.status === "FAILED") {
    return run.errorMessage ?? "Falha na execução";
  }
  if (cuts?.length) {
    return `${cuts.length} cortes priorizados`;
  }
  return undefined;
};

export const useCutsOverview = (locale: string) => {
  const runsQuery = useCutsRuns({ limit: 50 });
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

    const recentRuns = runs.slice(0, 3).map((run) => ({
      id: run.id,
      title: formatRunTitle(run),
      preview: formatRunPreview(run),
    }));

    return {
      isLoading: runsQuery.isLoading || statsQuery.isLoading,
      stats: {
        totalRuns: statsQuery.data?.totalRuns ?? runs.length,
        completedRuns: statsQuery.data?.completed ?? 0,
        approvedRuns,
        creditsUsed,
        usageByDay,
      },
      recentRuns,
    };
  }, [locale, runs, runsQuery.isLoading, statsQuery.data, statsQuery.isLoading]);
};
