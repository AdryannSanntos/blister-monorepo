"use client";

import type { CutOutput } from "@company-os/types";
import { Film, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { formatCutWindow } from "src/core/modules/agents/utils/cuts-display";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutStoryPlayerProps = {
  /** Legacy fallback when cutFileId is not available yet. */
  fallbackSrc?: string | null;
  cut: CutOutput | null;
  isResolvingSource?: boolean;
  /** Hide the title/score/description block — shown elsewhere in the layout. */
  hideMeta?: boolean;
  className?: string;
};

/** Vertical 9:16 preview — plays rendered clip or loops source within the cut window. */
export const CutStoryPlayer = ({
  fallbackSrc,
  cut,
  isResolvingSource,
  hideMeta = false,
  className,
}: CutStoryPlayerProps) => {
  const t = useTranslations("cuts.review");
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipPreview = useCutClipPreviewUrl(cut, Boolean(cut));
  const usesRenderedClip = Boolean(cut?.cutFileId);
  const src = usesRenderedClip
    ? (clipPreview.data?.url ?? null)
    : (fallbackSrc ?? null);
  const isLoading = usesRenderedClip
    ? clipPreview.isLoading
    : Boolean(isResolvingSource);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cut || usesRenderedClip) return;

    const seekToStart = () => {
      try {
        video.currentTime = cut.startSec;
        void video.play().catch(() => undefined);
      } catch {
        /* metadata not ready */
      }
    };

    if (video.readyState >= 1) {
      seekToStart();
    } else {
      video.addEventListener("loadedmetadata", seekToStart, { once: true });
    }

    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
    };
  }, [cut, src, usesRenderedClip]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cut || usesRenderedClip) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= cut.endSec) {
        video.currentTime = cut.startSec;
        void video.play().catch(() => undefined);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [cut, usesRenderedClip]);

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-4", className)}
      data-testid="cut-story-player"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-4">
        <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-lg)]">
          {src && cut ? (
            <video
              key={`${src}-${cut.id}`}
              ref={videoRef}
              src={src}
              className="size-full object-cover"
              controls
              playsInline
              preload="metadata"
              aria-label={cut.title}
            >
              <track kind="captions" />
            </video>
          ) : isLoading ? (
            <div className="flex size-full min-h-[280px] min-w-[158px] flex-col items-center justify-center gap-3">
              <Loader2
                className="size-8 animate-spin text-[var(--accent)]"
                aria-hidden
              />
              <Paragraph size="p6" tone="tertiary">
                {t("loadingPreview")}
              </Paragraph>
            </div>
          ) : (
            <div className="flex size-full min-h-[280px] min-w-[158px] flex-col items-center justify-center gap-2 px-4 text-center">
              <Film className="size-8 text-[var(--fg-quaternary)]" aria-hidden />
              <Paragraph size="p6" tone="tertiary">
                {t("selectCutHint")}
              </Paragraph>
            </div>
          )}
        </div>
      </div>

      {cut && !hideMeta ? (
        <div className="shrink-0 space-y-2 border-t border-[var(--line-subtle)] pt-4">
          <div className="flex items-start justify-between gap-3">
            <Paragraph size="p3" tone="primary" className="font-medium">
              {cut.title}
            </Paragraph>
            <Badge
              variant={viralScoreBadgeVariant(cut.viralScore)}
              className="shrink-0 tabular-nums"
            >
              {t("viralScore", { score: cut.viralScore })}
            </Badge>
          </div>
          <Paragraph size="p6" tone="tertiary" className="font-mono tabular-nums">
            {formatCutWindow(cut.startSec, cut.endSec)}
          </Paragraph>
          {cut.description ? (
            <Paragraph size="p4" tone="secondary" className="line-clamp-3">
              {cut.description}
            </Paragraph>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
