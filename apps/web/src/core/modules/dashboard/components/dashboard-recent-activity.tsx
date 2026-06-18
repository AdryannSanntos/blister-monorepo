"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { History, Scissors } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import {
  getReviewStatusLabelKey,
  getRunUserInput,
} from "src/core/modules/agents/utils/agent-run-helpers";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Button } from "src/core/shared/components/ui/button";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Badge } from "src/core/shared/components/ui/badge";

type DashboardRecentActivityProps = {
  runs: AgentRunStatusDto[];
  isLoading?: boolean;
};

function formatRunDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardRecentActivity({
  runs,
  isLoading = false,
}: DashboardRecentActivityProps) {
  const t = useTranslations("dashboard.homePage.recentActivity");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();

  const recentRuns = runs.slice(0, 6);

  return (
    <SectionCard icon={History} title={t("title")} description={t("description")}>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-[var(--r-md)]" />
          ))}
        </div>
      ) : recentRuns.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-[var(--fg-primary)]">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recentRuns.map((run) => {
            const reviewKey = getReviewStatusLabelKey(run.reviewStatus);

            return (
              <div
                key={run.id}
                className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
                    <Scissors className="size-4 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium text-[var(--fg-primary)]">
                        {run.agentId}
                      </p>
                      {reviewKey ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {tStatus(reviewKey)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {run.status.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--fg-secondary)]">
                      {getRunUserInput(run) || t("untitledRun")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-[12px] tabular-nums text-[var(--fg-tertiary)]">
                    {formatRunDate(run.createdAt, locale)}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/agents/${run.agentId}?runId=${run.id}`}>
                      {t("open")}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/agents/cuts/history">{t("viewAll")}</Link>
        </Button>
      </div>
    </SectionCard>
  );
}
