"use client";

import { Scissors } from "lucide-react";
import { useTranslations } from "next-intl";

import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { CutsRunCard } from "src/core/modules/agents/components/cuts/cuts-run-card";
import type { CutsViewableRun } from "src/core/modules/agents/utils/cuts-viewable-runs";
import { Badge } from "src/core/shared/components/ui/badge";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

type CutsResultsGridProps = {
  runs: CutsViewableRun[];
  isLoading: boolean;
};

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }, (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
      >
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-2 px-3.5 py-3">
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-3 w-[35%]" />
        </div>
      </div>
    ))}
  </div>
);

export const CutsResultsGrid = ({ runs, isLoading }: CutsResultsGridProps) => {
  const t = useTranslations("agents.overview.runsGrid");

  return (
    <section
      data-testid="cuts-results-grid"
      aria-label={t("sectionAria")}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Heading level="h5" as="h2">
            {t("title")}
          </Heading>
          {isLoading ? (
            <Skeleton className="h-6 w-[5.5rem] rounded-[var(--r-full)]" />
          ) : (
            <Badge variant="secondary">{t("count", { count: runs.length })}</Badge>
          )}
        </div>
        <Paragraph size="p5" tone="tertiary">
          {isLoading ? t("loading") : t("description")}
        </Paragraph>
      </header>

      {isLoading ? (
        <LoadingGrid />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title={t("empty")}
          description={t("emptyHint")}
          action={<AgentNewRunButton routeSlug="cuts" size="sm" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {runs.map((run) => (
            <CutsRunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </section>
  );
};
