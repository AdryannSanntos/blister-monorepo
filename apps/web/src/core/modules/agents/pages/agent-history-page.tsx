"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { redirect } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { useCutsRuns } from "src/core/modules/agents/hooks/use-cuts-runs";
import { getRunUserInput } from "src/core/modules/agents/utils/agent-run-helpers";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type AgentHistoryPageProps = {
  agentSlug: string;
};

const formatRunDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const AgentHistoryPage = ({ agentSlug }: AgentHistoryPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const t = useTranslations("agents.historyTable");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();
  const { data, isLoading } = useCutsRuns({ limit: 50 });
  const runs = data?.runs ?? [];

  const columns = useMemo<ColumnDef<AgentRunStatusDto>[]>(
    () => [
      {
        id: "title",
        header: t("columns.title"),
        cell: ({ row }) => (
          <Paragraph className="truncate font-medium">
            {getRunUserInput(row.original) || t("untitledRun")}
          </Paragraph>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => (
          <span className="text-[13px] capitalize text-[var(--fg-secondary)]">
            {row.original.reviewStatus
              ? tStatus(
                  row.original.reviewStatus === "PENDING_REVIEW"
                    ? "reviewPending"
                    : row.original.reviewStatus === "APPROVED"
                      ? "reviewApproved"
                      : row.original.reviewStatus === "REJECTED"
                        ? "reviewRejected"
                        : "reviewEdited",
                )
              : row.original.status.toLowerCase()}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[13px] text-[var(--fg-tertiary)]">
            {formatRunDate(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        accessorKey: "creditCost",
        header: t("columns.credits"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
            {row.original.creditCost?.toFixed(1) ?? "—"}
          </span>
        ),
      },
    ],
    [locale, t, tStatus],
  );

  if (!agent) {
    redirect("/dashboard");
  }

  return (
    <div data-testid="agent-history-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={t("title", { agent: agent.name })}
        description={t("description")}
        actions={<AgentNewRunButton routeSlug={agent.routeSlug} size="sm" />}
      >
        <AgentEntitlementGate agent={agent}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Paragraph size="p5" tone="tertiary">
                {t("count", { count: runs.length })}
              </Paragraph>
              <AgentNewRunButton
                routeSlug={agent.routeSlug}
                variant="outline"
                size="sm"
              />
            </div>

            {isLoading ? (
              <div className="h-48 animate-pulse rounded-[var(--r-lg)] bg-[var(--bg-sunken)]" />
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] py-16 text-center">
                <Paragraph className="font-medium">{t("empty")}</Paragraph>
                <Paragraph size="p5" tone="tertiary">
                  {t("emptyHint")}
                </Paragraph>
                <AgentNewRunButton routeSlug={agent.routeSlug} size="sm" />
              </div>
            ) : (
              <DataTable columns={columns} data={runs} />
            )}
          </div>
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
