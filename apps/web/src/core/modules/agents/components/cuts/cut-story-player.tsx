"use client";

import type { CutOutput } from "@company-os/types";
import { Film, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useLayoutEffect, useMemo, useRef } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useCutSegmentVideo } from "src/core/modules/agents/hooks/use-cut-segment-video";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { bindVideoSrc } from "src/core/modules/agents/utils/bind-video-src";
import { buildSegmentMediaSrc } from "src/core/modules/agents/utils/build-segment-media-src";
import { formatCutWindow } from "src/core/modules/agents/utils/cuts-display";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutStoryPlayerProps = {
  /** Shared source URL while the rendered clip is not ready yet. */
  fallbackSrc?: string | null;
  /** Stable key for the shared source (usually sourceFileId or blob url). */
  fallbackResourceKey?: string | null;
  cut: CutOutput | null;
  isResolvingSource?: boolean;
  hideMeta?: boolean;
  className?: string;
};

/** Vertical 9:16 preview — one persistent `<video>` per mount. */
export const CutStoryPlayer = memo(function CutStoryPlayer({
  fallbackSrc,
  fallbackResourceKey,
  cut,
  isResolvingSource,
  hideMeta = false,
  className,
}: CutStoryPlayerProps) {
  const t = useTranslations("cuts.review");
  const videoRef = useRef<HTMLVideoElement>(null);
  const boundPlaybackSrcRef = useRef<string | null>(null);

  const usesRenderedClip = Boolean(cut?.cutFileId);
  const clipPreview = useCutClipPreviewUrl(cut, usesRenderedClip);

  const clipUrl = useStableMediaUrl(
    cut?.cutFileId ?? null,
    clipPreview.data?.url ?? null,
  );
  const sourceUrl = useStableMediaUrl(
    fallbackResourceKey ?? null,
    fallbackSrc ?? null,
  );

  const hasRenderedClipUrl = usesRenderedClip && Boolean(clipUrl);
  const segmentMode = Boolean(cut && sourceUrl && !hasRenderedClipUrl);

  const playbackSrc = useMemo(() => {
    if (hasRenderedClipUrl && clipUrl) return clipUrl;
    if (segmentMode && cut && sourceUrl) {
      return buildSegmentMediaSrc(sourceUrl, cut.startSec, cut.endSec);
    }
    return sourceUrl;
  }, [hasRenderedClipUrl, clipUrl, segmentMode, cut, sourceUrl]);

  const isLoading =
    !playbackSrc &&
    (usesRenderedClip
      ? clipPreview.isLoading
      : Boolean(isResolvingSource));

  const cutId = cut?.id ?? null;
  const startSec = cut?.startSec ?? 0;
  const endSec = cut?.endSec ?? 0;

  useCutSegmentVideo({
    videoRef,
    enabled: segmentMode,
    cutId,
    startSec,
    endSec,
  });

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    bindVideoSrc(video, playbackSrc ?? null, boundPlaybackSrcRef);
  }, [playbackSrc]);

  const showOverlay = !playbackSrc || !cut;

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-4", className)}
      data-testid="cut-story-player"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-4">
        <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-lg)]">
          <video
            ref={videoRef}
            className={cn(
              "size-full object-cover",
              showOverlay && "pointer-events-none invisible",
            )}
            controls={!showOverlay}
            playsInline
            preload={hasRenderedClipUrl ? "auto" : "metadata"}
            aria-label={cut?.title}
            aria-hidden={showOverlay}
          >
            <track kind="captions" />
          </video>

          {showOverlay ? (
            isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-canvas)]">
                <Loader2
                  className="size-8 animate-spin text-[var(--accent)]"
                  aria-hidden
                />
                <Paragraph size="p6" tone="tertiary">
                  {t("loadingPreview")}
                </Paragraph>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--bg-canvas)] px-4 text-center">
                <Film className="size-8 text-[var(--fg-quaternary)]" aria-hidden />
                <Paragraph size="p6" tone="tertiary">
                  {t("selectCutHint")}
                </Paragraph>
              </div>
            )
          ) : null}
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
});
