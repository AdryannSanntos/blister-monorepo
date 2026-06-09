"use client";

import {
  CheckCircle2,
  Coins,
  LayoutDashboard,
  Library,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Link } from "@/i18n/routing";
import { AGENT_UI_IDS } from "src/core/modules/agents/config/agent-ui-config";
import { useAllAgentRuns } from "src/core/modules/agents/hooks/use-agent-runs";
import { useCampaigns } from "src/core/modules/agents/hooks/use-campaigns";
import { useCompany } from "src/core/modules/company/hooks/use-company";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Button } from "src/core/shared/components/ui/button";

import { DashboardActivityChart } from "../components/dashboard-activity-chart";
import { DashboardBrandMemoryPanel } from "../components/dashboard-brand-memory-panel";
import { DashboardQuickActions } from "../components/dashboard-quick-actions";
import { DashboardRecentActivity } from "../components/dashboard-recent-activity";
import { DashboardStatCard } from "../components/dashboard-stat-card";
import { DashboardStatusChart } from "../components/dashboard-status-chart";
import {
  buildRunStatusChartData,
  computeDashboardRunMetrics,
  formatDashboardCurrency,
  toActivityChartRuns,
} from "../utils/dashboard-metrics";

export function DashboardHomePage() {
  const t = useTranslations("dashboard.homePage");
  const locale = useLocale();

  const { data: company } = useCompany();
  const { data: credits, isLoading: isCreditsLoading } = useCredits();
  const { data: runs = [], isLoading: isRunsLoading } = useAllAgentRuns([
    ...AGENT_UI_IDS,
  ]);
  const { campaigns } = useCampaigns();

  const metrics = useMemo(() => computeDashboardRunMetrics(runs), [runs]);

  const balance = credits?.balance?.amount
    ? parseFloat(credits.balance.amount)
    : 0;
  const balanceFormatted = formatDashboardCurrency(balance, locale);
  const isLowBalance = balance < 2;

  const statusChartData = useMemo(
    () =>
      buildRunStatusChartData(metrics, {
        completed: t("charts.status.labels.completed"),
        active: t("charts.status.labels.active"),
        failed: t("charts.status.labels.failed"),
        pendingReview: t("charts.status.labels.pendingReview"),
      }),
    [metrics, t],
  );

  const activityRuns = useMemo(() => toActivityChartRuns(runs), [runs]);

  const title = company?.name
    ? t("greeting", { name: company.name })
    : t("greetingFallback");

  return (
    <PageLayout
      icon={LayoutDashboard}
      title={title}
      description={t("subtitle")}
      actions={
        <Button asChild>
          <Link href="/dashboard/agents/post">
            <Sparkles className="size-4" />
            {t("primaryAction")}
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label={t("kpi.credits.label")}
          value={balanceFormatted}
          hint={isLowBalance ? t("kpi.credits.lowHint") : t("kpi.credits.hint")}
          icon={Coins}
          isLoading={isCreditsLoading}
          tone={isLowBalance ? "danger" : "default"}
        />
        <DashboardStatCard
          label={t("kpi.creations.label")}
          value={String(metrics.totalRuns)}
          hint={t("kpi.creations.hint", { count: metrics.runsThisWeek })}
          icon={Sparkles}
          isLoading={isRunsLoading}
        />
        <DashboardStatCard
          label={t("kpi.pendingReview.label")}
          value={String(metrics.pendingReview)}
          hint={t("kpi.pendingReview.hint")}
          icon={CheckCircle2}
          isLoading={isRunsLoading}
          tone={metrics.pendingReview > 0 ? "warning" : "default"}
        />
        <DashboardStatCard
          label={t("kpi.campaigns.label")}
          value={String(campaigns.length)}
          hint={t("kpi.campaigns.hint")}
          icon={Library}
        />
      </div>

      <DashboardBrandMemoryPanel />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardActivityChart runs={activityRuns} />
        </div>
        <DashboardStatusChart data={statusChartData} totalRuns={metrics.totalRuns} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <DashboardQuickActions />
        <DashboardRecentActivity runs={runs} isLoading={isRunsLoading} />
      </div>
    </PageLayout>
  );
}
