"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { IconHistory } from "@tabler/icons-react";
import { History, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { SpiralLoader } from "@/components/agent-elements/spiral-loader";
import { Button } from "@/core/shared/components/ui/button";
import { cn } from "@/core/shared/utils";

import type { AgentUiId } from "../config/agent-ui-config";
import {
  getAgentOutputPreview,
  getReviewStatusLabelKey,
  getRunUserInput,
} from "../utils/agent-run-helpers";

type AgentHistoryPanelProps = {
  agentId: AgentUiId;
  runs: AgentRunStatusDto[];
  isLoading: boolean;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onNewRun: () => void;
};

function formatRunDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AgentHistoryPanel({
  agentId,
  runs,
  isLoading,
  selectedRunId,
  onSelectRun,
  onNewRun,
}: AgentHistoryPanelProps) {
  const t = useTranslations("agents.history");
  const tReview = useTranslations("agents.status");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <SpiralLoader size={32} />
        <p className="text-sm text-[var(--fg-tertiary)]">{t("loading")}</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-[var(--r-lg)] bg-[var(--bg-raised)] text-[var(--fg-tertiary)]">
          <History className="size-5" aria-hidden />
        </div>
        <div className="max-w-sm space-y-1">
          <p className="text-[15px] font-medium text-[var(--fg-primary)]">
            {t("empty")}
          </p>
          <p className="text-[14px] text-[var(--fg-tertiary)]">{t("emptyHint")}</p>
        </div>
        <Button type="button" size="sm" onClick={onNewRun} className="gap-1.5">
          <Plus className="size-4" />
          {t("newRun")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-an flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          {t("count", { count: runs.length })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNewRun}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          {t("newRun")}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        {runs.map((run) => {
          const prompt = getRunUserInput(run) || t("untitledRun");
          const preview = getAgentOutputPreview(agentId, run.outputPayload);
          const reviewKey = getReviewStatusLabelKey(run.reviewStatus);
          const statusLabel = reviewKey
            ? tReview(reviewKey)
            : run.status.toLowerCase();
          const isSelected = selectedRunId === run.id;

          return (
            <button
              key={run.id}
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelectRun(run.id)}
              className={cn(
                "group w-full rounded-[var(--r-lg)] border px-4 py-3.5 text-left transition-[border-color,background-color] duration-[var(--dur-fast)]",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line-subtle)] bg-[var(--bg-base)] hover:border-[color-mix(in_oklch,var(--accent)_25%,var(--line-subtle))] hover:bg-[var(--bg-raised)]",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)]",
                    isSelected
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]",
                  )}
                >
                  <IconHistory className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                    {prompt}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                    {formatRunDate(run.createdAt, locale)} · {statusLabel}
                  </p>
                  {preview ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-[var(--fg-secondary)]">
                      {preview}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
