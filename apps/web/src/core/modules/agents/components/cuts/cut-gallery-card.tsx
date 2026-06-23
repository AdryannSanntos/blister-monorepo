"use client";

import type { CutOutput } from "@company-os/types";
import { Check, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { formatCutDuration } from "src/core/modules/agents/utils/cuts-display";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Card } from "src/core/shared/components/ui/card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

type CutGalleryCardProps = {
  cut: CutOutput;
  index: number;
  selected: boolean;
  reviewable?: boolean;
  decision?: CutDecision;
  onOpen: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

export const CutGalleryCard = memo(function CutGalleryCard({
  cut,
  index,
  selected,
  reviewable = false,
  decision,
  onOpen,
  onApprove,
  onReject,
}: CutGalleryCardProps) {
  const t = useTranslations("cuts.review");
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasRendered = Boolean(cut.cutFileId);
  const clipPreview = useCutClipPreviewUrl(
    hasRendered ? cut : null,
    hasRendered,
  );
  const clipUrl = useStableMediaUrl(
    cut.cutFileId ?? null,
    clipPreview.data?.url ?? null,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl) return;

    const handleLoadedData = () => {
      video.currentTime = 0;
      video.pause();
    };
    video.addEventListener("loadeddata", handleLoadedData);
    return () => video.removeEventListener("loadeddata", handleLoadedData);
  }, [clipUrl]);

  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (video) void video.play().catch(() => undefined);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const isApproved = decision === "approve";
  const isRejected = decision === "reject";

  return (
    <Card
      data-interactive="true"
      data-selected={selected}
      data-testid="cut-gallery-card"
      className={cn(
        "group overflow-hidden",
        isApproved && "border-[var(--success)]",
        isRejected && "border-[var(--danger)] opacity-70",
      )}
    >
      {/* Vertical clip preview — the thumbnail opens the focused preview */}
      <button
        type="button"
        aria-label={t("selectCutAria", { number: index + 1, title: cut.title })}
        onClick={onOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative block aspect-[9/16] w-full overflow-hidden bg-black text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-raised)]"
      >
        {!hasRendered ? (
          <>
            <Skeleton className="absolute inset-0 rounded-none" />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[var(--fg-quaternary)]">
              {t("rendering")}
            </span>
          </>
        ) : clipUrl ? (
          <video
            ref={videoRef}
            src={clipUrl}
            className="size-full object-cover"
            preload="metadata"
            muted
            loop
            playsInline
            aria-label={cut.title}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-[var(--bg-sunken)]" />
        )}

        {/* Hover play affordance */}
        {hasRendered ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:opacity-100">
            <span className="flex size-11 items-center justify-center rounded-[var(--r-full)] bg-black/45 backdrop-blur-sm">
              <Play className="size-5 fill-white text-white" />
            </span>
          </div>
        ) : null}

        {/* Index pill */}
        <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-[var(--r-full)] bg-black/55 px-1.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
          {index + 1}
        </span>

        {/* Viral score */}
        {hasRendered ? (
          <Badge
            variant={viralScoreBadgeVariant(cut.viralScore)}
            className="absolute right-2 top-2 tabular-nums shadow-[var(--shadow-sm)]"
          >
            {t("viralScore", { score: cut.viralScore })}
          </Badge>
        ) : null}

        {/* Duration */}
        {hasRendered ? (
          <span className="absolute bottom-2 right-2 rounded-[var(--r-sm)] bg-black/55 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white backdrop-blur-sm">
            {formatCutDuration(cut.durationSec)}
          </span>
        ) : null}

        {/* Decision overlay */}
        {isApproved ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--success)_28%,transparent)]">
            <span className="flex size-12 items-center justify-center rounded-[var(--r-full)] bg-[var(--success)]">
              <Check className="size-6 text-white" strokeWidth={3} />
            </span>
          </div>
        ) : isRejected ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--danger)_28%,transparent)]">
            <span className="flex size-12 items-center justify-center rounded-[var(--r-full)] bg-[var(--danger)]">
              <X className="size-6 text-white" strokeWidth={3} />
            </span>
          </div>
        ) : null}
      </button>

      {/* Body */}
      <div className="flex flex-col gap-3 p-3.5">
        <p
          className="line-clamp-2 min-h-[2.6em] text-[13px] font-medium leading-[1.3] text-[var(--fg-primary)]"
          title={cut.title}
        >
          {cut.title}
        </p>

        {hasRendered ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-[var(--r-full)] bg-[var(--bg-sunken)]">
              <div
                className="h-full rounded-[var(--r-full)] bg-[var(--accent)]"
                style={{ width: `${cut.viralScore}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--fg-tertiary)]">
              {cut.viralScore}%
            </span>
          </div>
        ) : null}

        {reviewable && hasRendered && (onApprove || onReject) ? (
          <div className="flex items-center gap-2">
            {onReject ? (
              <button
                type="button"
                onClick={onReject}
                aria-label={t("reject")}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border-[1.5px] text-[12px] font-bold transition-[background,color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                  isRejected
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                    : "border-[var(--line-default)] bg-transparent text-[var(--fg-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]",
                )}
              >
                <X className="size-3.5" strokeWidth={2.5} />
                {t("reject")}
              </button>
            ) : null}
            {onApprove ? (
              <button
                type="button"
                onClick={onApprove}
                aria-label={t("approve")}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border-[1.5px] text-[12px] font-bold transition-[background,color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                  isApproved
                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                    : "border-[var(--line-default)] bg-transparent text-[var(--fg-secondary)] hover:border-[var(--success)] hover:text-[var(--success)]",
                )}
              >
                <Check className="size-3.5" strokeWidth={2.5} />
                {t("approve")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
});
