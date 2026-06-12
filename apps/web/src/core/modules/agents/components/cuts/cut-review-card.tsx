"use client";

import type { CutOutput } from "@company-os/types";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type CutReviewCardProps = {
  cut: CutOutput;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  decision?: "approve" | "reject";
};

export const CutReviewCard = ({
  cut,
  onApprove,
  onReject,
  disabled = false,
  decision,
}: CutReviewCardProps) => {
  const t = useTranslations("cuts.review");

  return (
    <div
      data-testid={`cut-review-card-${cut.id}`}
      className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level="h6" as="h3">
            {cut.title}
          </Heading>
          <Paragraph size="p6" tone="tertiary">
            {cut.description}
          </Paragraph>
        </div>
        <Paragraph size="p6" className="font-mono tabular-nums text-[var(--text-secondary)]">
          {cut.startSec}s – {cut.endSec}s
        </Paragraph>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Paragraph size="p6" tone="quaternary">
            {t("retentionLabel")}
          </Paragraph>
          <Paragraph size="p6" className="font-medium">
            {cut.viralScore}%
          </Paragraph>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
            style={{ width: `${cut.viralScore}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={decision === "reject" ? "destructive" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={onReject}
          className="gap-1.5"
          aria-pressed={decision === "reject"}
        >
          <X className="size-4" aria-hidden />
          {t("reject")}
        </Button>
        <Button
          type="button"
          variant={decision === "approve" ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={onApprove}
          className="gap-1.5"
          aria-pressed={decision === "approve"}
        >
          <Check className="size-4" aria-hidden />
          {t("approve")}
        </Button>
      </div>
    </div>
  );
};
