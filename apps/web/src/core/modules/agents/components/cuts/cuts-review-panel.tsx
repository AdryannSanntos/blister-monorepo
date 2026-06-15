"use client";

import type { CutOutput } from "@company-os/types";
import { useTranslations } from "next-intl";

import { CutStoryPlayer } from "src/core/modules/agents/components/cuts/cut-story-player";
import { CutStoryThumb } from "src/core/modules/agents/components/cuts/cut-story-thumb";
import { formatCutWindow } from "src/core/modules/agents/utils/cuts-display";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

export type CutsReviewPanelProps = {
  cuts: CutOutput[];
  selectedCut: CutOutput | null;
  fallbackPlayerSrc?: string | null;
  isResolvingSource?: boolean;
  reviewable?: boolean;
  decisions?: Record<string, CutDecision>;
  className?: string;
  onSelectCut: (cutId: string) => void;
  onApprove?: (cutId: string) => void;
  onReject?: (cutId: string) => void;
};

export const CutsReviewPanel = ({
  cuts,
  selectedCut,
  fallbackPlayerSrc,
  isResolvingSource,
  reviewable = false,
  decisions = {},
  className,
  onSelectCut,
  onApprove,
  onReject,
}: CutsReviewPanelProps) => {
  const t = useTranslations("cuts.review");

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-6 lg:grid-cols-[2fr_1fr]",
        className,
      )}
      data-testid="cuts-results-step"
    >
      {/* Left: cut list + selected cut details. */}
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Paragraph
            size="p6"
            tone="quaternary"
            className="font-medium uppercase tracking-[0.12em]"
          >
            {t("cutsListLabel")}
          </Paragraph>

          <div
            className="grid min-h-0 grid-cols-4 gap-3 overflow-y-auto pr-1 content-start"
            role="listbox"
            aria-label={t("cutsListLabel")}
          >
            {cuts.map((cut, index) => (
              <CutStoryThumb
                key={cut.id}
                cut={cut}
                index={index}
                selected={cut.id === selectedCut?.id}
                fallbackVideoSrc={fallbackPlayerSrc}
                reviewable={reviewable}
                compact
                decision={decisions[cut.id]}
                onSelect={() => onSelectCut(cut.id)}
                onApprove={onApprove ? () => onApprove(cut.id) : undefined}
                onReject={onReject ? () => onReject(cut.id) : undefined}
              />
            ))}
          </div>
        </div>

        {selectedCut ? (
          <div className="shrink-0 space-y-2 border-t border-[var(--line-subtle)] pt-4">
            <div className="flex items-start justify-between gap-3">
              <Paragraph size="p3" tone="primary" className="font-medium">
                {selectedCut.title}
              </Paragraph>
              <Badge
                variant={viralScoreBadgeVariant(selectedCut.viralScore)}
                className="shrink-0 tabular-nums"
              >
                {t("viralScore", { score: selectedCut.viralScore })}
              </Badge>
            </div>
            <Paragraph
              size="p6"
              tone="tertiary"
              className="font-mono tabular-nums"
            >
              {formatCutWindow(selectedCut.startSec, selectedCut.endSec)}
            </Paragraph>
            {selectedCut.description ? (
              <Paragraph size="p4" tone="secondary" className="line-clamp-3">
                {selectedCut.description}
              </Paragraph>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Right: preview player only. */}
      <div className="flex min-h-0 flex-col gap-3 lg:min-h-[min(70vh,640px)]">
        <Paragraph
          size="p6"
          tone="quaternary"
          className="font-medium uppercase tracking-[0.12em]"
        >
          {t("previewLabel")}
        </Paragraph>

        <CutStoryPlayer
          fallbackSrc={fallbackPlayerSrc}
          cut={selectedCut}
          isResolvingSource={isResolvingSource}
          hideMeta
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
};
