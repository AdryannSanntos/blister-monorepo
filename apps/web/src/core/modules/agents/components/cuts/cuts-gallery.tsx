"use client";

import type { CutOutput, CutsTranscriptSegment } from "@company-os/types";
import { useTranslations } from "next-intl";
import { memo, useMemo, useState } from "react";

import { CutGalleryCard } from "src/core/modules/agents/components/cuts/cut-gallery-card";
import { CutPreviewDialog } from "src/core/modules/agents/components/cuts/cut-preview-dialog";
import { Badge } from "src/core/shared/components/ui/badge";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

type CutsGalleryProps = {
  cuts: CutOutput[];
  totalCuts: number;
  selectedCut: CutOutput | null;
  transcript?: CutsTranscriptSegment[];
  fallbackPlayerSrc?: string | null;
  fallbackPlayerResourceKey?: string | null;
  isResolvingSource?: boolean;
  reviewable?: boolean;
  decisions?: Record<string, CutDecision>;
  className?: string;
  onSelectCut: (cutId: string) => void;
  onApprove?: (cutId: string) => void;
  onReject?: (cutId: string) => void;
};

const GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

export const CutsGallery = memo(function CutsGallery({
  cuts,
  totalCuts,
  selectedCut,
  transcript,
  fallbackPlayerSrc,
  fallbackPlayerResourceKey,
  isResolvingSource,
  reviewable = false,
  decisions = {},
  className,
  onSelectCut,
  onApprove,
  onReject,
}: CutsGalleryProps) {
  const t = useTranslations("cuts.review");
  const [dialogOpen, setDialogOpen] = useState(false);

  const renderedCuts = useMemo(
    () => cuts.filter((cut) => Boolean(cut.cutFileId)),
    [cuts],
  );

  const avgScore = useMemo(() => {
    if (renderedCuts.length === 0) return null;
    const sum = renderedCuts.reduce((acc, cut) => acc + cut.viralScore, 0);
    return Math.round(sum / renderedCuts.length);
  }, [renderedCuts]);

  const selectedIndex = selectedCut
    ? cuts.findIndex((cut) => cut.id === selectedCut.id)
    : -1;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < cuts.length - 1;

  const openCut = (cutId: string) => {
    onSelectCut(cutId);
    setDialogOpen(true);
  };

  const goTo = (offset: number) => {
    if (selectedIndex < 0) return;
    const next = cuts[selectedIndex + offset];
    if (next) onSelectCut(next.id);
  };

  const slotCount = Math.max(cuts.length, totalCuts);

  return (
    <section
      data-testid="cuts-gallery"
      aria-label={t("cutsListLabel")}
      className={cn("flex min-h-0 flex-col gap-4", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <Heading level="h5" as="h2">
            {t("cutsListLabel")}
          </Heading>
          <Badge variant="secondary" className="tabular-nums">
            {t("cutsCount", { count: cuts.length })}
          </Badge>
        </div>
        {avgScore != null ? (
          <Paragraph size="p5" tone="tertiary" className="tabular-nums">
            {t("avgScore", { score: avgScore })}
          </Paragraph>
        ) : null}
      </header>

      <div className={GRID_CLASS}>
        {Array.from({ length: slotCount }, (_, index) => {
          const cut = cuts[index];
          if (cut) {
            return (
              <CutGalleryCard
                key={cut.id}
                cut={cut}
                index={index}
                selected={cut.id === selectedCut?.id}
                reviewable={reviewable}
                decision={decisions[cut.id]}
                onOpen={() => openCut(cut.id)}
                onApprove={onApprove ? () => onApprove(cut.id) : undefined}
                onReject={onReject ? () => onReject(cut.id) : undefined}
              />
            );
          }
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static, order-stable placeholder slots with no identity
              key={`slot-${index}`}
              className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-raised)]"
              aria-hidden
            >
              <Skeleton className="aspect-[9/16] w-full rounded-none" />
              <div className="flex flex-col gap-2 p-3.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          );
        })}
      </div>

      <CutPreviewDialog
        open={dialogOpen}
        cut={selectedCut}
        index={selectedIndex < 0 ? 0 : selectedIndex}
        total={cuts.length}
        hasPrev={hasPrev}
        hasNext={hasNext}
        transcript={transcript}
        fallbackPlayerSrc={fallbackPlayerSrc}
        fallbackPlayerResourceKey={fallbackPlayerResourceKey}
        isResolvingSource={isResolvingSource}
        reviewable={reviewable}
        decision={selectedCut ? decisions[selectedCut.id] : undefined}
        onOpenChange={setDialogOpen}
        onPrev={() => goTo(-1)}
        onNext={() => goTo(1)}
        onApprove={
          onApprove && selectedCut ? () => onApprove(selectedCut.id) : undefined
        }
        onReject={
          onReject && selectedCut ? () => onReject(selectedCut.id) : undefined
        }
      />
    </section>
  );
});
