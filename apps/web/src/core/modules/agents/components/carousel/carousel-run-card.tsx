"use client";

import { GalleryHorizontal, Loader2, AlertCircle } from "lucide-react";
import { memo, useCallback } from "react";

import { CarouselSlideRenderer } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import type { CarouselViewableRun } from "src/core/modules/agents/utils/carousel-run-display";
import { isCarouselProcessingRun } from "src/core/modules/agents/utils/carousel-run-display";
import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn, truncateWithEllipsis } from "src/core/shared/utils";
import { useRouter } from "@/i18n/routing";

const CAROUSEL_ROUTE_SLUG = "carousel";
const THEME_MAX_CHARS = 52;

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "destructive" | "warning" }
> = {
  QUEUED: { label: "Processando", variant: "secondary" },
  RUNNING: { label: "Processando", variant: "secondary" },
  PAUSED: { label: "Aguardando você", variant: "warning" },
  FAILED: { label: "Falhou", variant: "destructive" },
};

export const CarouselRunCard = memo(({ run }: { run: CarouselViewableRun }) => {
  const router = useRouter();
  const displayTheme = truncateWithEllipsis(run.theme, THEME_MAX_CHARS);
  const isProcessing = isCarouselProcessingRun(run);
  const isFailed = run.status === "FAILED";
  const firstSlide = run.firstSlide;
  const showSlidePreview = Boolean(firstSlide) && !isProcessing && !isFailed;
  const badge = STATUS_BADGE[run.status];

  const handleOpen = useCallback(() => {
    router.push(getAgentRunPath(CAROUSEL_ROUTE_SLUG, run.id));
  }, [router, run.id]);

  return (
    <article
      data-testid={`carousel-run-card-${run.id}`}
      className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <button
        type="button"
        aria-label={`Abrir execução: ${run.theme}`}
        onClick={handleOpen}
        className={cn(
          "relative aspect-[4/5] w-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          !showSlidePreview &&
            "flex items-center justify-center bg-[color-mix(in_oklch,var(--bg-sunken)_88%,var(--bg-base))] text-[var(--fg-quaternary)]",
        )}
      >
        {isProcessing ? (
          <Loader2 className="size-8 animate-spin text-[var(--accent)]" />
        ) : isFailed ? (
          <AlertCircle className="size-8 text-[var(--danger)]" />
        ) : showSlidePreview && firstSlide ? (
          <CarouselSlideRenderer slide={firstSlide} fill />
        ) : (
          <GalleryHorizontal className="size-8" />
        )}
        {badge ? (
          <Badge variant={badge.variant} className="absolute top-2.5 left-2.5">
            {badge.label}
          </Badge>
        ) : null}
      </button>

      <div className="flex flex-col gap-1.5 px-3.5 py-3">
        <button
          type="button"
          onClick={handleOpen}
          className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Paragraph className="line-clamp-2 text-[13.5px] font-medium leading-snug text-[var(--fg-primary)]">
            {displayTheme}
          </Paragraph>
        </button>
        <Paragraph size="p6" tone="tertiary" className="text-[12px]">
          {run.slidesCount} slides · {run.templateId}
        </Paragraph>
      </div>
    </article>
  );
});
CarouselRunCard.displayName = "CarouselRunCard";
