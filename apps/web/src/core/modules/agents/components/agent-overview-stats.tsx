"use client";

import { CheckCircle2, Coins, History, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardStatCard } from "src/core/modules/dashboard/components/dashboard-stat-card";

type AgentOverviewStatsProps = {
  totalRuns: number;
  completedRuns: number;
  approvedRuns: number;
  creditsUsed: number;
};

export const AgentOverviewStats = ({
  totalRuns,
  completedRuns,
  approvedRuns,
  creditsUsed,
}: AgentOverviewStatsProps) => {
  const t = useTranslations("agents.overview.stats");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label={t("totalRuns.label")}
        value={String(totalRuns)}
        hint={t("totalRuns.hint")}
        icon={History}
      />
      <DashboardStatCard
        label={t("completed.label")}
        value={String(completedRuns)}
        hint={t("completed.hint")}
        icon={Sparkles}
        tone={completedRuns > 0 ? "success" : "default"}
      />
      <DashboardStatCard
        label={t("approved.label")}
        value={String(approvedRuns)}
        hint={t("approved.hint")}
        icon={CheckCircle2}
        tone={approvedRuns > 0 ? "success" : "default"}
      />
      <DashboardStatCard
        label={t("credits.label")}
        value={creditsUsed.toFixed(1)}
        hint={t("credits.hint")}
        icon={Coins}
      />
    </div>
  );
};
