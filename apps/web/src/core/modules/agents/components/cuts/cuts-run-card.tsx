"use client";

import { AlertCircle, Clapperboard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, type KeyboardEvent } from "react";

import type { CutsViewableRun } from "src/core/modules/agents/utils/cuts-viewable-runs";
import {
  getOverviewCardProgressPercent,
  isProcessingRun,
} from "src/core/modules/agents/utils/cuts-viewable-runs";
import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Progress } from "src/core/shared/components/ui/progress";
import { truncateWithEllipsis } from "src/core/shared/utils";

import { useRouter } from "@/i18n/routing";

const SOURCE_TITLE_MAX_CHARS = 52;
const CUTS_ROUTE_SLUG = "cuts";

type CutsRunCardProps = {
  run: CutsViewableRun;
};

export const CutsRunCard = memo(({ run }: CutsRunCardProps) => {
  const t = useTranslations("agents.overview.runsGrid");
  const router = useRouter();
  const displayTitle = truncateWithEllipsis(
    run.sourceTitle,
    SOURCE_TITLE_MAX_CHARS,
  );
  const processing = isProcessingRun(run);
  const failed = run.status === "FAILED";
  const progressPercent = getOverviewCardProgressPercent(run);

  const handleOpenRun = useCallback(() => {
    router.push(getAgentRunPath(CUTS_ROUTE_SLUG, run.id));
  }, [router, run.id]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleOpenRun();
      }
    },
    [handleOpenRun],
  );

  const statusLabel = processing
    ? t("statusProcessing")
    : failed
      ? t("statusFailed")
      : run.status === "PAUSED"
        ? t("statusReview")
        : null;

  return (
    <article
      data-testid={`cuts-run-card-${run.id}`}
      data-run-status={run.status}
      className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <button
        type="button"
        data-testid={`cuts-run-card-preview-${run.id}`}
        aria-label={t("openPreview", { name: run.sourceTitle })}
        onClick={handleOpenRun}
        onKeyDown={handleKeyDown}
        className="relative flex aspect-video w-full cursor-pointer items-center justify-center bg-[color-mix(in_oklch,var(--bg-sunken)_88%,var(--bg-base))] text-[var(--fg-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        {processing ? (
          <Loader2
            className="size-8 animate-spin text-[var(--accent)]"
            aria-hidden
            data-testid={`cuts-run-card-loader-${run.id}`}
          />
        ) : failed ? (
          <AlertCircle className="size-8 text-[var(--danger)]" aria-hidden />
        ) : (
          <Clapperboard className="size-8" aria-hidden />
        )}
        {statusLabel ? (
          <Badge
            variant={failed ? "destructive" : "secondary"}
            className="absolute top-2.5 left-2.5"
          >
            {statusLabel}
          </Badge>
        ) : null}
      </button>

      <div className="flex flex-col gap-2 px-3.5 py-3">
        <button
          type="button"
          data-testid={`cuts-run-card-title-${run.id}`}
          aria-label={t("openPreview", { name: run.sourceTitle })}
          onClick={handleOpenRun}
          onKeyDown={handleKeyDown}
          className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        >
          <Paragraph
            className="line-clamp-2 text-[13.5px] leading-[1.35] font-medium text-[var(--fg-primary)]"
            title={displayTitle !== run.sourceTitle ? run.sourceTitle : undefined}
          >
            {displayTitle}
          </Paragraph>
        </button>

        {processing && progressPercent !== null ? (
          <div
            className="flex flex-col gap-1.5"
            data-testid={`cuts-run-card-progress-${run.id}`}
            aria-busy="true"
            aria-live="polite"
          >
            <Progress value={progressPercent} />
            <Paragraph size="p6" tone="tertiary" className="text-[12px]">
              {t("processingProgress", { percent: progressPercent })}
            </Paragraph>
          </div>
        ) : (
          <Paragraph
            size="p6"
            tone="tertiary"
            className="tabular-nums text-[12px] leading-[1.3]"
          >
            {failed
              ? t("failedHint")
              : t("cutsCount", { count: run.cutsCount })}
          </Paragraph>
        )}
      </div>
    </article>
  );
});

CutsRunCard.displayName = "CutsRunCard";
