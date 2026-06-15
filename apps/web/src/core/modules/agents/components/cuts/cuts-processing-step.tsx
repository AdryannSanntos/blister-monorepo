"use client";

import type { AgentRunStatus } from "@company-os/types";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Progress } from "src/core/shared/components/ui/progress";

type CutsProcessingStepProps = {
  isUploading: boolean;
  uploadProgress: number;
  sourceFileName: string | null;
  runStatus: AgentRunStatus | null;
};

export const CutsProcessingStep = ({
  isUploading,
  uploadProgress,
  sourceFileName,
  runStatus,
}: CutsProcessingStepProps) => {
  const t = useTranslations("cuts.modal");

  const agentMessage =
    runStatus === "RUNNING" ? t("generating") : t("starting");

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-16"
      data-testid="cuts-processing-step"
      data-mode={isUploading ? "upload" : "agent"}
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className="size-10 animate-spin text-[var(--accent)]"
        aria-hidden
      />

      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <Paragraph className="font-medium">
          {isUploading ? t("uploading") : agentMessage}
        </Paragraph>

        {isUploading ? (
          <div className="flex w-full flex-col gap-2">
            <Progress value={uploadProgress} aria-label={t("uploading")} />
            <Paragraph size="p6" tone="tertiary">
              {t("uploadProgress", { progress: Math.round(uploadProgress) })}
            </Paragraph>
          </div>
        ) : null}

        {sourceFileName ? (
          <Paragraph size="p6" tone="tertiary" className="max-w-full truncate">
            {t("selectedFile", { name: sourceFileName })}
          </Paragraph>
        ) : null}

        <Paragraph size="p6" tone="tertiary">
          {t("doNotCloseHint")}
        </Paragraph>
      </div>
    </div>
  );
};
