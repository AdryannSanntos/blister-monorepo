"use client";

import type { AgentRunStatus, AgentRunStatusDto } from "@company-os/types";
import { Scissors } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { CutsViewCutsAction } from "src/core/modules/agents/components/cuts/cuts-view-cuts-action";
import { useCutsRuns } from "src/core/modules/agents/hooks/use-cuts-runs";
import {
  countApprovedCuts,
  extractCutsFromRunDto,
  getRunSourceTitle,
} from "src/core/modules/agents/utils/cuts-run-display";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

type CutsResultsPageProps = {
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

type BadgeVariant =
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "secondary";

const statusBadgeVariant = (status: AgentRunStatus): BadgeVariant => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PAUSED":
      return "warning";
    case "FAILED":
      return "destructive";
    case "RUNNING":
    case "QUEUED":
      return "info";
    default:
      return "secondary";
  }
};

const isViewableRun = (run: AgentRunStatusDto) =>
  run.status === "COMPLETED" ||
  run.status === "PAUSED" ||
  (run.status === "FAILED" && extractCutsFromRunDto(run).length > 0);

export const CutsResultsPage = ({ agentSlug }: CutsResultsPageProps) => {
  const t = useTranslations("cuts.results");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();
  const { data, isLoading } = useCutsRuns({ limit: 50 });

  const runs = useMemo(
    () => (data?.runs ?? []).filter(isViewableRun),
    [data?.runs],
  );

  const columns = useMemo<ColumnDef<AgentRunStatusDto>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("columns.source"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Paragraph className="truncate font-medium">
              {getRunSourceTitle(row.original.inputPayload)}
            </Paragraph>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {tStatus(row.original.status.toLowerCase())}
          </Badge>
        ),
      },
      {
        id: "cuts",
        header: t("columns.cuts"),
        cell: ({ row }) => {
          const cuts = extractCutsFromRunDto(row.original);
          return (
            <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
              {cuts.length > 0 ? cuts.length : "—"}
            </span>
          );
        },
      },
      {
        id: "approved",
        header: t("columns.approved"),
        cell: ({ row }) => {
          const cuts = extractCutsFromRunDto(row.original);
          if (cuts.length === 0) {
            return (
              <span className="text-[13px] text-[var(--fg-tertiary)]">—</span>
            );
          }
          return (
            <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
              {countApprovedCuts(cuts)}
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
        accessorKey: "creditCost",
        header: t("columns.credits"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
            {row.original.creditCost != null
              ? row.original.creditCost.toFixed(1)
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <CutsViewCutsAction run={row.original} />,
      },
    ],
    [locale, t, tStatus],
  );

  if (agentSlug !== "cuts") return null;

  return (
    <div data-testid="cuts-results-page">
      <PageLayout
        icon={Scissors}
        title={t("title")}
        description={t("description")}
        actions={<AgentNewRunButton routeSlug="cuts" size="sm" />}
      >
        <div className="flex flex-col gap-4">
          <Paragraph size="p5" tone="tertiary">
            {isLoading ? t("loading") : t("count", { count: runs.length })}
          </Paragraph>

          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-[var(--r-lg)]" />
          ) : (
            <DataTable
              columns={columns}
              data={runs}
              getRowId={(row) => row.id}
              enablePagination
              pageSize={10}
              emptyState={{
                icon: Scissors,
                title: t("empty"),
                description: t("emptyHint"),
                action: <AgentNewRunButton routeSlug="cuts" size="sm" />,
              }}
            />
          )}
        </div>
      </PageLayout>
    </div>
  );
};
