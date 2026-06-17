"use client";

import type { AgentRunStatus } from "@company-os/types";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "src/core/shared/utils";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type StepStatus = "pending" | "running" | "done";

type ProcessingStep = {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
};

type CutsProcessingStepProps = {
  isUploading: boolean;
  uploadProgress: number;
  sourceFileName: string | null;
  runStatus: AgentRunStatus | null;
  resolveSourceDone: boolean;
  rankSegmentsDone: boolean;
  progressiveRenderedCount: number;
  totalCuts: number;
};

function StepRow({ step }: { step: ProcessingStep }) {
  return (
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
          <Paragraph size="p6" tone="tertiary">{step.detail}</Paragraph>
        ) : null}
      </div>
    </div>
  );
}

export const CutsProcessingStep = ({
  isUploading,
  uploadProgress,
  sourceFileName,
  runStatus,
  resolveSourceDone,
  rankSegmentsDone,
  progressiveRenderedCount,
  totalCuts,
}: CutsProcessingStepProps) => {
  const t = useTranslations("cuts.modal");

  if (isUploading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12" data-testid="cuts-processing-step" aria-busy="true">
        <Loader2 className="size-10 animate-spin text-[var(--accent)]" />
        <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
          <Paragraph className="font-medium">{t("uploading")}</Paragraph>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--line-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <Paragraph size="p6" tone="tertiary">
            {t("uploadProgress", { progress: Math.round(uploadProgress) })}
          </Paragraph>
          {sourceFileName ? (
            <Paragraph size="p6" tone="tertiary" className="max-w-full truncate">{sourceFileName}</Paragraph>
          ) : null}
        </div>
      </div>
    );
  }

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
      status: resolveSourceDone ? "done" : runStatus === "RUNNING" ? "running" : "pending",
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

  return (
    <div className="flex flex-col gap-4 py-8 px-2" data-testid="cuts-processing-step" aria-busy="true" aria-live="polite">
      {steps.map((step) => (
        <StepRow key={step.key} step={step} />
      ))}
      {sourceFileName ? (
        <Paragraph size="p6" tone="quaternary" className="mt-2 truncate text-center">
          {sourceFileName}
        </Paragraph>
      ) : null}
    </div>
  );
};
