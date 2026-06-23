"use client";

import { CheckCircle2, Loader2, Scissors } from "lucide-react";
import { useTranslations } from "next-intl";

import { CutsGallery } from "src/core/modules/agents/components/cuts/cuts-gallery";
import { CutsRunProgress } from "src/core/modules/agents/components/cuts/cuts-run-progress";
import { useCutsRunDetail } from "src/core/modules/agents/hooks/use-cuts-run-detail";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import {
  cn,
  DISPLAY_FILENAME_MAX_CHARS,
  truncateWithEllipsis,
} from "src/core/shared/utils";

type CutsRunDetailPageProps = {
  agentSlug: string;
  runId: string;
};

const resolveStatusKey = (
  status: string | null,
  reviewable: boolean,
): string => {
  if (reviewable) return "paused";
  switch (status) {
    case "QUEUED":
      return "queued";
    case "RUNNING":
      return "running";
    case "PAUSED":
      return "paused";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "running";
  }
};

export const CutsRunDetailPage = ({
  agentSlug,
  runId,
}: CutsRunDetailPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const tDetail = useTranslations("cuts.runDetail");
  const tModal = useTranslations("cuts.modal");
  const tReview = useTranslations("cuts.review");
  const tStatus = useTranslations("agents.status");

  const detail = useCutsRunDetail(runId);

  const {
    isLoading,
    isError,
    sourceFileName,
    runStatus,
    isRunActive,
    showProgress,
    cuts,
    transcript,
    selectedCut,
    decisions,
    reviewable,
    allDecided,
    playerSrc,
    playerSrcResourceKey,
    isResolvingSource,
    isSubmittingReview,
    errorMessage,
    totalCuts,
    progressiveRenderedCount,
    resolveSourceDone,
    rankSegmentsDone,
    setSelectedCut,
    setDecision,
    handleSubmitReview,
  } = detail;

  const statusKey = resolveStatusKey(runStatus, reviewable);
  const decidedCount = cuts.filter((cut) => decisions[cut.id]).length;
  const overviewHref = `/dashboard/agents/${agentSlug}/overview`;
  const backButton = {
    href: overviewHref,
    label: tDetail("back"),
  };
  const pageIcon = agent?.icon ?? Scissors;

  if (isLoading) {
    return (
      <div
        data-testid="cuts-run-detail-page"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PageLayout
          icon={pageIcon}
          title={tDetail("loading")}
          backButton={backButton}
        >
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2
              className="size-8 animate-spin text-[var(--accent)]"
              aria-hidden
            />
          </div>
        </PageLayout>
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div
        data-testid="cuts-run-detail-page"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PageLayout
          icon={pageIcon}
          title={tDetail("title")}
          backButton={backButton}
        >
          <Paragraph role="alert">{tDetail("errorLoad")}</Paragraph>
        </PageLayout>
      </div>
    );
  }

  return (
    <div
      data-testid="cuts-run-detail-page"
      className="flex min-h-0 flex-1 flex-col"
    >
      <PageLayout
        icon={pageIcon}
        title={sourceFileName ?? tDetail("title")}
        backButton={backButton}
        description={
          sourceFileName ? (
            <span title={sourceFileName}>
              {tDetail("sourceLabel", {
                name: truncateWithEllipsis(
                  sourceFileName,
                  DISPLAY_FILENAME_MAX_CHARS,
                ),
              })}
            </span>
          ) : undefined
        }
        actions={
          <Badge
            variant={statusKey === "completed" ? "success" : "secondary"}
            className="capitalize"
          >
            {tStatus(statusKey)}
          </Badge>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-6 pb-2">
          {showProgress ? (
            <CutsRunProgress
              sourceFileName={sourceFileName}
              runStatus={runStatus}
              resolveSourceDone={resolveSourceDone}
              rankSegmentsDone={rankSegmentsDone}
              progressiveRenderedCount={progressiveRenderedCount}
              totalCuts={totalCuts}
            />
          ) : null}

          {isRunActive && cuts.length > 0 ? (
            <Paragraph
              size="p6"
              tone="tertiary"
              className="flex items-center gap-2"
            >
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              {tModal("finishingRenders")}
            </Paragraph>
          ) : null}

          {cuts.length === 0 && showProgress ? (
            <Paragraph size="p6" tone="tertiary" className="text-center">
              {tDetail("activeHint")}
            </Paragraph>
          ) : null}

          {cuts.length > 0 ? (
            <CutsGallery
              className="animate-in fade-in duration-[var(--dur-slow)]"
              cuts={cuts}
              totalCuts={totalCuts}
              selectedCut={selectedCut}
              transcript={transcript}
              fallbackPlayerSrc={playerSrc}
              fallbackPlayerResourceKey={playerSrcResourceKey}
              isResolvingSource={isResolvingSource}
              reviewable={reviewable}
              decisions={decisions}
              onSelectCut={setSelectedCut}
              onApprove={(cutId) => setDecision(cutId, "approve")}
              onReject={(cutId) => setDecision(cutId, "reject")}
            />
          ) : null}

          {reviewable || errorMessage ? (
            <div
              className={cn(
                "sticky bottom-0 z-10 -mx-6 mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--line-default)] bg-[var(--bg-base)]/95 px-6 py-4 backdrop-blur",
              )}
            >
              {errorMessage ? (
                <Paragraph
                  size="p5"
                  className="mr-auto text-[var(--danger)]"
                  role="alert"
                >
                  {errorMessage}
                </Paragraph>
              ) : reviewable ? (
                <Paragraph
                  size="p5"
                  tone="tertiary"
                  className="mr-auto flex items-center gap-2 tabular-nums"
                >
                  <CheckCircle2
                    className={cn(
                      "size-4",
                      allDecided
                        ? "text-[var(--success)]"
                        : "text-[var(--fg-quaternary)]",
                    )}
                  />
                  {tReview("decidedProgress", {
                    decided: decidedCount,
                    total: cuts.length,
                  })}
                </Paragraph>
              ) : null}

              {reviewable ? (
                <Button
                  type="button"
                  disabled={!allDecided || isSubmittingReview}
                  onClick={() => void handleSubmitReview()}
                  data-testid="cuts-submit-review-button"
                >
                  {isSubmittingReview
                    ? tModal("submitting")
                    : tModal("submitReview")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </PageLayout>
    </div>
  );
};
