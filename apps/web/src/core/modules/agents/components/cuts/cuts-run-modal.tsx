"use client";

import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CutsProcessingStep } from "src/core/modules/agents/components/cuts/cuts-processing-step";
import { CutsReviewPanel } from "src/core/modules/agents/components/cuts/cuts-review-panel";
import { CutsSourceStep } from "src/core/modules/agents/components/cuts/cuts-source-step";
import type { useCutsRunModal } from "src/core/modules/agents/hooks/use-cuts-run-modal";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutsController = ReturnType<typeof useCutsRunModal>;

export const CutsRunModal = ({
  controller,
}: {
  controller: CutsController;
}) => {
  const t = useTranslations("cuts.modal");
  const tReview = useTranslations("cuts.review");
  const {
    open,
    phase,
    intent,
    localFile,
    sourceFileName,
    sourceFileSize,
    hasSource,
    hasExistingSource,
    uploadProgress,
    isUploading,
    runStatus,
    isRunActive,
    cuts,
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
    handleClose,
    handleLocalFileChange,
    handleSelectExistingFile,
    handleStartRun,
    setSelectedCut,
    setDecision,
    handleSubmitReview,
    handleRetry,
  } = controller;

  const [resultsRevealed, setResultsRevealed] = useState(false);

  const isResults = phase === "results";
  const isProcessing = phase === "processing";
  const isUploadBusy = isProcessing && isUploading;
  const isBusy = isUploadBusy;
  const contentVisible = intent === "view" || resultsRevealed;

  useEffect(() => {
    if (intent === "view" && phase === "results") {
      setResultsRevealed(true);
      return;
    }
    if (phase === "results" && cuts.length > 0) {
      const frame = requestAnimationFrame(() => setResultsRevealed(true));
      return () => cancelAnimationFrame(frame);
    }
    setResultsRevealed(false);
    return undefined;
  }, [phase, cuts.length, intent]);

  const decidedCount = cuts.filter((cut) => decisions[cut.id]).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isBusy) handleClose();
      }}
    >
      <DialogContent
        data-testid="cuts-run-modal"
        data-phase={phase}
        showCloseButton={!isBusy}
        className={cn(
          isResults
            ? "flex max-h-[min(94vh,1000px)] h-[min(94vh,900px)] max-w-[min(97vw,1180px)] flex-col overflow-hidden gap-0 p-0 sm:max-w-[min(97vw,1180px)]"
            : phase === "error"
              ? "max-w-lg gap-6"
              : "max-w-2xl gap-6 overflow-hidden",
        )}
      >
        <DialogDescription className="sr-only">
          {isResults ? t("viewRunTitle", { count: cuts.length }) : t("title")}
        </DialogDescription>

        {phase === "source" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
            </DialogHeader>

            <CutsSourceStep
              localFile={localFile}
              existingFileName={hasExistingSource ? sourceFileName : null}
              existingFileSize={hasExistingSource ? sourceFileSize : null}
              hasSource={hasSource}
              onLocalFileChange={handleLocalFileChange}
              onSelectExistingFile={handleSelectExistingFile}
              onStartRun={handleStartRun}
            />
          </>
        ) : null}

        {isProcessing ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isUploading ? t("uploading") : t("processingTitle")}
              </DialogTitle>
            </DialogHeader>

            <CutsProcessingStep
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              sourceFileName={sourceFileName}
              runStatus={runStatus}
              resolveSourceDone={resolveSourceDone}
              rankSegmentsDone={rankSegmentsDone}
              progressiveRenderedCount={progressiveRenderedCount}
              totalCuts={totalCuts}
            />
          </>
        ) : null}

        {isResults ? (
          <>
            <DialogHeader className="shrink-0 gap-1 border-b border-[var(--line-subtle)] px-5 py-4">
              <DialogTitle className="text-sm font-medium text-[var(--fg-primary)]">
                {intent === "view"
                  ? t("viewRunTitle", { count: cuts.length })
                  : t("doneMessage", { count: cuts.length })}
              </DialogTitle>
              {isRunActive && intent === "generate" ? (
                <Paragraph size="p6" tone="tertiary" className="flex items-center gap-2">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  {cuts.length > 0 ? t("finishingRenders") : t("generating")}
                </Paragraph>
              ) : null}
              {sourceFileName ? (
                <Paragraph size="p6" tone="tertiary" className="truncate">
                  {sourceFileName}
                </Paragraph>
              ) : null}
            </DialogHeader>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 transition-opacity duration-[var(--dur-base)]",
                contentVisible ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {cuts.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
                  <Loader2
                    className="size-8 animate-spin text-[var(--accent)]"
                    aria-hidden
                  />
                  <Paragraph size="p4" tone="tertiary" className="text-center">
                    {t("generating")}
                  </Paragraph>
                </div>
              ) : (
                <CutsReviewPanel
                  cuts={cuts}
                  selectedCut={selectedCut}
                  fallbackPlayerSrc={playerSrc}
                  fallbackPlayerResourceKey={playerSrcResourceKey}
                  isResolvingSource={isResolvingSource}
                  reviewable={reviewable}
                  decisions={decisions}
                  className="min-h-0 flex-1"
                  onSelectCut={setSelectedCut}
                  onApprove={(cutId) => setDecision(cutId, "approve")}
                  onReject={(cutId) => setDecision(cutId, "reject")}
                />
              )}
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-[var(--line-subtle)] px-5 py-4">
              {reviewable && selectedCut ? (
                <>
                  <Button
                    type="button"
                    variant={
                      decisions[selectedCut.id] === "reject"
                        ? "destructive"
                        : "outline"
                    }
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDecision(selectedCut.id, "reject")}
                  >
                    <X className="size-4" aria-hidden />
                    {tReview("reject")}
                  </Button>
                  <Button
                    type="button"
                    variant={
                      decisions[selectedCut.id] === "approve" ? "default" : "outline"
                    }
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDecision(selectedCut.id, "approve")}
                  >
                    <Check className="size-4" aria-hidden />
                    {tReview("approve")}
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                {intent === "view" ? t("close") : t("goToResults")}
              </Button>
              {reviewable ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={!allDecided || isSubmittingReview}
                  onClick={() => void handleSubmitReview()}
                  data-testid="cuts-submit-review-button"
                >
                  {isSubmittingReview
                    ? t("submitting")
                    : allDecided
                      ? t("submitReview")
                      : t("submitReviewPending", {
                          decided: decidedCount,
                          total: cuts.length,
                        })}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}

        {phase === "error" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("errorGeneric")}</DialogTitle>
            </DialogHeader>

            <div
              className="flex flex-col items-center gap-4 py-4"
              data-testid="cuts-error-step"
            >
              <AlertCircle
                className="size-12 text-[var(--danger)]"
                aria-hidden
              />
              <Paragraph className="text-center">
                {errorMessage ?? t("errorGeneric")}
              </Paragraph>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("close")}
              </Button>
              <Button type="button" onClick={handleRetry}>
                {t("retry")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
