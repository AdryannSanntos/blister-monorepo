import type { AgentRunStatusDto } from "@company-os/types";

export type DashboardRunMetrics = {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  activeRuns: number;
  pendingReview: number;
  totalCreditCost: number;
  runsThisWeek: number;
};

export function computeDashboardRunMetrics(
  runs: AgentRunStatusDto[],
): DashboardRunMetrics {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  return runs.reduce<DashboardRunMetrics>(
    (metrics, run) => {
      const createdAt = new Date(run.createdAt).getTime();
      const isThisWeek = createdAt >= weekAgo;

      return {
        totalRuns: metrics.totalRuns + 1,
        completedRuns:
          metrics.completedRuns + (run.status === "COMPLETED" ? 1 : 0),
        failedRuns: metrics.failedRuns + (run.status === "FAILED" ? 1 : 0),
        activeRuns:
          metrics.activeRuns +
          (run.status === "RUNNING" ||
          run.status === "QUEUED" ||
          run.status === "PAUSED"
            ? 1
            : 0),
        pendingReview:
          metrics.pendingReview +
          (run.reviewStatus === "PENDING_REVIEW" ? 1 : 0),
        totalCreditCost: metrics.totalCreditCost + (run.creditCost ?? 0),
        runsThisWeek: metrics.runsThisWeek + (isThisWeek ? 1 : 0),
      };
    },
    {
      totalRuns: 0,
      completedRuns: 0,
      failedRuns: 0,
      activeRuns: 0,
      pendingReview: 0,
      totalCreditCost: 0,
      runsThisWeek: 0,
    },
  );
}

export function toActivityChartRuns(runs: AgentRunStatusDto[]) {
  return runs.map((run) => ({
    createdAt: run.createdAt,
    technicalCost: run.creditCost ?? 0,
  }));
}

export type RunStatusChartItem = {
  label: string;
  count: number;
  fill: string;
};

export function buildRunStatusChartData(
  metrics: DashboardRunMetrics,
  labels: {
    completed: string;
    active: string;
    failed: string;
    pendingReview: string;
  },
): RunStatusChartItem[] {
  return [
    {
      label: labels.completed,
      count: metrics.completedRuns,
      fill: "var(--success)",
    },
    {
      label: labels.pendingReview,
      count: metrics.pendingReview,
      fill: "var(--warning)",
    },
    {
      label: labels.active,
      count: metrics.activeRuns,
      fill: "var(--info)",
    },
    {
      label: labels.failed,
      count: metrics.failedRuns,
      fill: "var(--danger)",
    },
  ].filter((item) => item.count > 0);
}

export function formatDashboardCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "pt-BR" ? "en-US" : locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
