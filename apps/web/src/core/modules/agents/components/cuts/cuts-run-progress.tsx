"use client";

import type { AgentRunStatus } from "@company-os/types";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn, DISPLAY_FILENAME_MAX_CHARS, truncateWithEllipsis } from "src/core/shared/utils";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type StepStatus = "pending" | "running" | "done";

type ProcessingStep = {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
};

export type CutsRunProgressProps = {
  sourceFileName: string | null;
  runStatus: AgentRunStatus | null;
  resolveSourceDone: boolean;
  rankSegmentsDone: boolean;
  progressiveRenderedCount: number;
  totalCuts: number;
  className?: string;
};

const StepRow = ({ step }: { step: ProcessingStep }) => (
  <div className="flex items-center gap-3">
    <div className="flex size-5 shrink-0 items-center justify-center">
      {step.status === "done" ? (
        <div className="flex size-5 items-center justify-center rounded-full bg-[var(--accent)]">
          <Check className="size-3 text-white" strokeWidth={3} />
        </div>
      ) : step.status === "running" ? (
        <Loader2 className="size-5 animate-spin text-[var(--accent)]" />
      ) : (
        <div className="size-2 rounded-full bg-[var(--fg-quaternary)]" />
      )}
    </div>
    <div className="flex flex-col">
      <Paragraph
        size="p4"
        tone={step.status === "pending" ? "quaternary" : "primary"}
        className={cn("font-medium", step.status === "done" && "line-through opacity-60")}
      >
        {step.label}
      </Paragraph>
      {step.detail && step.status !== "pending" ? (
        <Paragraph size="p6" tone="tertiary">
          {step.detail}
        </Paragraph>
      ) : null}
    </div>
  </div>
);

export const CutsRunProgress = ({
  sourceFileName,
  runStatus,
  resolveSourceDone,
  rankSegmentsDone,
  progressiveRenderedCount,
  totalCuts,
  className,
}: CutsRunProgressProps) => {
  const t = useTranslations("cuts.modal");

  const isQueued = runStatus === "QUEUED";

  const transcribeStatus: StepStatus = resolveSourceDone
    ? "done"
    : runStatus === "RUNNING"
      ? "running"
      : "pending";

  const renderLabel =
    totalCuts > 0
      ? t("renderingCuts", { done: progressiveRenderedCount, total: totalCuts })
      : t("preparingRender");

  const renderStatus: StepStatus =
    progressiveRenderedCount >= totalCuts && totalCuts > 0
      ? "done"
      : totalCuts > 0 || rankSegmentsDone
        ? "running"
        : "pending";

  const steps: ProcessingStep[] = [
    {
      key: "resolve_source",
      label: t("stepTranscribe"),
      status: transcribeStatus,
    },
    {
      key: "rank_segments",
      label: t("stepRankCuts"),
      status: rankSegmentsDone ? "done" : resolveSourceDone ? "running" : "pending",
    },
    {
      key: "dispatch_renders",
      label: renderLabel,
      status: renderStatus,
      detail: totalCuts > 0 ? `${progressiveRenderedCount}/${totalCuts}` : undefined,
    },
  ];

  const hasActiveProgress = steps.some(
    (step) => step.status === "running" || step.status === "done",
  );

  if (!hasActiveProgress) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] py-12",
          className,
        )}
        data-testid="cuts-run-progress"
        data-processing-state={isQueued ? "queued" : "bootstrapping"}
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 className="size-10 animate-spin text-[var(--accent)]" aria-hidden />
        <Paragraph className="font-medium">
          {isQueued ? t("waitingInQueue") : t("starting")}
        </Paragraph>
        {sourceFileName ? (
          <Paragraph
            size="p6"
            tone="tertiary"
            className="max-w-full px-4 text-center"
            title={sourceFileName}
          >
            {truncateWithEllipsis(sourceFileName, DISPLAY_FILENAME_MAX_CHARS)}
          </Paragraph>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-8",
        className,
      )}
      data-testid="cuts-run-progress"
      data-processing-state="steps"
      aria-busy="true"
      aria-live="polite"
    >
      {steps.map((step) => (
        <StepRow key={step.key} step={step} />
      ))}
      {sourceFileName ? (
        <Paragraph
          size="p6"
          tone="quaternary"
          className="mt-2 max-w-full px-2 text-center"
          title={sourceFileName}
        >
          {truncateWithEllipsis(sourceFileName, DISPLAY_FILENAME_MAX_CHARS)}
        </Paragraph>
      ) : null}
    </div>
  );
};
