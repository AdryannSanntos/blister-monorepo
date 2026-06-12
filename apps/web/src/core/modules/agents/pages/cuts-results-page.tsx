"use client";

import type { CutOutput } from "@company-os/types";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Scissors } from "lucide-react";

import { CutReviewCard } from "src/core/modules/agents/components/cuts/cut-review-card";
import { useCutsRuns } from "src/core/modules/agents/hooks/use-cuts-runs";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SectionCard } from "src/core/shared/components/ui/section-card";

type CutsResultsPageProps = {
  agentSlug: string;
};

const formatRunLabel = (createdAt: string, inputPayload: Record<string, unknown>) => {
  const title = typeof inputPayload.userInput === "string" ? inputPayload.userInput : null;
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
  return title ? `${title} · ${date}` : date;
};

export const CutsResultsPage = ({ agentSlug }: CutsResultsPageProps) => {
  const t = useTranslations("cuts.results");
  const { data, isLoading } = useCutsRuns({ limit: 20 });

  const runs = data?.runs ?? [];

  const completedRuns = useMemo(
    () => runs.filter((run) => run.status === "COMPLETED"),
    [runs],
  );

  const latestApprovedCuts = useMemo(() => {
    const latest = completedRuns[0];
    if (!latest) return [];

    const cuts = (latest.outputPayload?.cuts as CutOutput[] | undefined) ?? [];
    return cuts.filter(
      (cut) => cut.reviewStatus === "approved" || cut.reviewStatus === "pending",
    );
  }, [completedRuns]);

  if (agentSlug !== "cuts") return null;

  return (
    <div data-testid="cuts-results-page">
      <PageLayout icon={Scissors} title={t("title")} description={t("description")}>
        <SectionCard icon={Scissors} title={t("latestTitle")} description={t("latestDescription")}>
          {isLoading ? <Paragraph tone="tertiary">{t("loading")}</Paragraph> : null}
          {!isLoading && latestApprovedCuts.length === 0 ? (
            <Paragraph tone="tertiary">{t("empty")}</Paragraph>
          ) : null}
          <div className="flex flex-col gap-4">
            {latestApprovedCuts.map((cut) => (
              <CutReviewCard
                key={cut.id}
                cut={cut}
                disabled
                decision={cut.reviewStatus === "approved" ? "approve" : undefined}
                onApprove={() => undefined}
                onReject={() => undefined}
              />
            ))}
          </div>
        </SectionCard>

        {completedRuns.length > 0 ? (
          <SectionCard
            icon={Scissors}
            title={t("historyTitle")}
            description={t("historyDescription")}
            className="mt-6"
          >
            <ul className="flex flex-col gap-2">
              {completedRuns.map((run) => {
                const cuts = (run.outputPayload?.cuts as CutOutput[] | undefined) ?? [];
                const approvedCount = cuts.filter((cut) => cut.reviewStatus === "approved").length;

                return (
                  <li
                    key={run.id}
                    className="rounded-[var(--r-lg)] border border-[var(--line-default)] px-4 py-3"
                    data-testid={`cuts-run-history-${run.id}`}
                  >
                    <Paragraph className="font-medium">
                      {formatRunLabel(run.createdAt, run.inputPayload)}
                    </Paragraph>
                    <Paragraph size="p6" tone="tertiary" className="mt-1">
                      {t("runSummary", { total: cuts.length, approved: approvedCount })}
                    </Paragraph>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ) : null}
      </PageLayout>
    </div>
  );
};
