"use client";

import { History } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Link } from "@/i18n/routing";
import {
  AGENT_UI_CONFIG,
  AGENT_UI_IDS,
  type AgentUiId,
} from "../config/agent-ui-config";
import { useAllAgentRuns } from "../hooks/use-agent-runs";
import {
  getAgentOutputPreview,
  getReviewStatusLabelKey,
  getRunUserInput,
} from "../utils/agent-run-helpers";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import type { AgentRunStatusDto } from "@company-os/types";

function formatRunDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryPage() {
  const t = useTranslations("agents.historyPage");
  const tAgents = useTranslations("agents");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();
  const { data: runs = [], isLoading } = useAllAgentRuns([...AGENT_UI_IDS]);

  const columns = useMemo<ColumnDef<AgentRunStatusDto>[]>(
    () => [
      {
        accessorKey: "agentId",
        header: t("columns.agent"),
        cell: ({ row }) => {
          const agentId = row.original.agentId as AgentUiId;
          const config = AGENT_UI_CONFIG[agentId];
          if (!config) return row.original.agentId;
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-[var(--accent)]" />
              <span>{tAgents(agentId)}</span>
            </div>
          );
        },
      },
      {
        id: "prompt",
        header: t("columns.prompt"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[320px] text-[13px] text-[var(--fg-primary)]">
            {getRunUserInput(row.original) || t("untitledRun")}
          </span>
        ),
      },
      {
        id: "preview",
        header: t("columns.result"),
        cell: ({ row }) => {
          const agentId = row.original.agentId as AgentUiId;
          const preview = getAgentOutputPreview(
            agentId,
            row.original.outputPayload,
          );
          return (
            <span className="line-clamp-2 max-w-[280px] text-[13px] text-[var(--fg-tertiary)]">
              {preview || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => {
          const reviewKey = getReviewStatusLabelKey(row.original.reviewStatus);
          if (reviewKey) {
            return (
              <span className="text-[13px] text-[var(--fg-secondary)]">
                {tStatus(reviewKey)}
              </span>
            );
          }
          return (
            <span className="text-[13px] capitalize text-[var(--fg-secondary)]">
              {row.original.status.toLowerCase()}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
            {formatRunDate(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const agentId = row.original.agentId;
          return (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/agents/${agentId}?runId=${row.original.id}`}>
                {t("openRun")}
              </Link>
            </Button>
          );
        },
      },
    ],
    [locale, t, tAgents, tStatus],
  );

  return (
    <PageLayout
      icon={History}
      title={t("title")}
      description={t("description")}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-[var(--r-lg)]" />
      ) : (
        <DataTable
          columns={columns}
          data={runs}
          emptyState={{
            title: t("empty"),
            description: t("emptyDescription"),
          }}
        />
      )}
    </PageLayout>
  );
}
