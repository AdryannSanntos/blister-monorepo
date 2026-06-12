"use client";

import type { AgentRunFixture } from "src/core/modules/blister-os/fixtures/agent-runs.fixture";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { useAgentRunsMock } from "src/core/modules/agents/hooks/use-agent-runs-mock";
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

const getStatusLabelKey = (run: AgentRunFixture) => {
  if (run.reviewStatus === "approved") return "reviewApproved";
  if (run.reviewStatus === "pending") return "reviewPending";
  if (run.reviewStatus === "rejected") return "reviewRejected";
  return run.status;
};

export const AgentHistoryPage = ({ agentSlug }: AgentHistoryPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const t = useTranslations("agents.historyTable");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();
  const { runs } = useAgentRunsMock(agent?.id ?? "");

  const columns = useMemo<ColumnDef<AgentRunFixture>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("columns.title"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Paragraph className="truncate font-medium">{row.original.title}</Paragraph>
            {row.original.preview ? (
              <Paragraph size="p6" tone="tertiary" className="mt-0.5 line-clamp-1">
                {row.original.preview}
              </Paragraph>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => {
          const key = getStatusLabelKey(row.original);
          return (
            <span className="text-[13px] text-[var(--fg-secondary)]">
              {tStatus(key)}
            </span>
          );
        },
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
        accessorKey: "creditsUsed",
        header: t("columns.credits"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
            {row.original.creditsUsed?.toFixed(1) ?? "—"}
          </span>
        ),
      },
    ],
    [locale, t, tStatus],
  );

  if (!agent) {
    return null;
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
              <AgentNewRunButton routeSlug={agent.routeSlug} variant="outline" size="sm" />
            </div>

            {runs.length === 0 ? (
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
