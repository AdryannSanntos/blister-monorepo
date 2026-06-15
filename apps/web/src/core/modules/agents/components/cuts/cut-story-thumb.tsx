"use client";

import type { CutOutput } from "@company-os/types";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import {
  formatCutWindow,
  shouldShowCutThumbnail,
} from "src/core/modules/agents/utils/cuts-display";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutStoryThumbProps = {
  cut: CutOutput;
  index: number;
  selected: boolean;
  fallbackVideoSrc?: string | null;
  reviewable?: boolean;
  decision?: "approve" | "reject";
  /** Compact grid cell — metadata below the preview. */
  compact?: boolean;
  onSelect: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

export const CutStoryThumb = ({
  cut,
  index,
  selected,
  fallbackVideoSrc,
  reviewable = false,
  decision,
  compact = false,
  onSelect,
  onApprove,
  onReject,
}: CutStoryThumbProps) => {
  const t = useTranslations("cuts.review");
  const previewRef = useRef<HTMLVideoElement>(null);
  const usesRenderedClip = Boolean(cut.cutFileId);
  // Resolve the clip URL for every rendered cut so each tile shows its own
  // thumbnail, not only the selected one.
  const clipPreview = useCutClipPreviewUrl(cut, usesRenderedClip || selected);
  const videoSrc = usesRenderedClip
    ? (clipPreview.data?.url ?? null)
    : (fallbackVideoSrc ?? null);
  const showVideoPreview = shouldShowCutThumbnail({
    hasVideoSrc: Boolean(videoSrc),
    usesRenderedClip,
    selected,
  });

  useEffect(() => {
    if (!showVideoPreview || usesRenderedClip) return;

    const video = previewRef.current;
    if (!video) return;

    const seek = () => {
      try {
        video.currentTime = cut.startSec;
      } catch {
        /* ignore */
      }
    };

    if (video.readyState >= 1) {
      seek();
    } else {
      video.addEventListener("loadedmetadata", seek, { once: true });
    }
  }, [showVideoPreview, usesRenderedClip, cut.startSec, cut.id]);

  return (
    <div
      data-testid={`cut-review-item-${cut.id}`}
      className={cn(
        "flex flex-col animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--dur-base)] ease-[var(--ease-out)]",
        compact ? "gap-1.5" : "gap-2",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={t("selectCutAria", { title: cut.title, number: index + 1 })}
        className={cn(
          "w-full rounded-[var(--r-md)] border p-1.5 text-left transition-colors duration-[var(--dur-fast)]",
          selected
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--line-subtle)] bg-[var(--bg-raised)] hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]",
        )}
      >
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[var(--r-sm)] bg-[var(--bg-sunken)]">
          {showVideoPreview && videoSrc ? (
            <video
              ref={previewRef}
              src={videoSrc}
              muted
              playsInline
              preload="metadata"
              className="size-full object-cover"
              aria-hidden
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-mono text-[13px] font-medium tabular-nums text-[var(--fg-quaternary)]">
                {index + 1}
              </span>
            </div>
          )}

          {decision === "approve" ? (
            <span className="absolute top-1.5 right-1.5">
              <Badge variant="success" className="size-5 rounded-full p-0">
                <Check className="size-3" aria-hidden />
              </Badge>
            </span>
          ) : null}
          {decision === "reject" ? (
            <span className="absolute top-1.5 right-1.5">
              <Badge variant="destructive" className="size-5 rounded-full p-0">
                <X className="size-3" aria-hidden />
              </Badge>
            </span>
          ) : null}
        </div>
      </button>

      {compact ? (
        <div className="space-y-1 px-0.5">
          <Paragraph
            size="p6"
            tone="primary"
            className="line-clamp-2 font-medium leading-snug"
          >
            {cut.title}
          </Paragraph>
          <div className="flex items-center justify-between gap-1">
            <Paragraph
              size="p6"
              tone="tertiary"
              className="truncate font-mono tabular-nums"
            >
              {formatCutWindow(cut.startSec, cut.endSec)}
            </Paragraph>
            <Badge
              variant={viralScoreBadgeVariant(cut.viralScore)}
              className="h-5 shrink-0 px-1.5 text-[10px] tabular-nums"
            >
              {t("viralScore", { score: cut.viralScore })}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-1 px-0.5">
          <Paragraph size="p5" tone="primary" className="line-clamp-2 font-medium">
            {cut.title}
          </Paragraph>
          <div className="flex items-center justify-between gap-2">
            <Paragraph size="p6" tone="tertiary" className="font-mono tabular-nums">
              {formatCutWindow(cut.startSec, cut.endSec)}
            </Paragraph>
            <Badge
              variant={viralScoreBadgeVariant(cut.viralScore)}
              className="h-5 px-1.5 text-[10px] tabular-nums"
            >
              {t("viralScore", { score: cut.viralScore })}
            </Badge>
          </div>
        </div>
      )}

      {reviewable && !compact ? (
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant={decision === "reject" ? "destructive" : "outline"}
            size="sm"
            onClick={onReject}
            className="h-8 flex-1 gap-1 px-2 text-xs"
            aria-pressed={decision === "reject"}
          >
            <X className="size-3.5" aria-hidden />
            {t("reject")}
          </Button>
          <Button
            type="button"
            variant={decision === "approve" ? "default" : "outline"}
            size="sm"
            onClick={onApprove}
            className="h-8 flex-1 gap-1 px-2 text-xs"
            aria-pressed={decision === "approve"}
          >
            <Check className="size-3.5" aria-hidden />
            {t("approve")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
