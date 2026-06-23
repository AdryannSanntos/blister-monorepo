"use client";

import { History, Scissors } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useAllAgentRuns } from "src/core/modules/agents/hooks/use-agent-runs";
import {
  getReviewStatusLabelKey,
  getRunUserInput,
} from "src/core/modules/agents/utils/agent-run-helpers";
import { DEFAULT_AGENT_IDS } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

const formatRunDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function HistoryPage() {
  const t = useTranslations("history");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();
  const { data: runs = [], isLoading } = useAllAgentRuns([...DEFAULT_AGENT_IDS]);

  return (
    <div data-testid="history-page">
      <PageLayout icon={History} title={t("title")} description={t("description")}>
        <SectionCard icon={History} title={t("listTitle")}>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[72px] w-full rounded-[var(--r-md)]" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={History}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {runs.map((run) => {
                const reviewKey = getReviewStatusLabelKey(run.reviewStatus);

                return (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-elevated)] px-4 py-3"
                  >
                    <div className="flex size-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--brand-secondary-soft)] text-[var(--secondary-600)]">
                      <Scissors className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                        {getRunUserInput(run) || t("untitledRun")}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                        {formatRunDate(run.createdAt, locale)}
                      </p>
                    </div>
                    {reviewKey ? (
                      <Badge variant="secondary">{tStatus(reviewKey)}</Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {run.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </PageLayout>
    </div>
  );
}
