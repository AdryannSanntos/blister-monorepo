"use client";

import type { CutOutput } from "@company-os/types";
import { Check, X } from "lucide-react";
import { memo, useEffect, useRef } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

type CutStoryThumbProps = {
  cut: CutOutput;
  index: number;
  selected: boolean;
  reviewable?: boolean;
  compact?: boolean;
  decision?: CutDecision;
  onSelect: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

function CutSkeleton({ index }: { index: number }) {
  return (
    <div className="relative flex aspect-[9/16] w-full flex-col overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-elevated)]">
      <div className="flex-1 animate-pulse bg-[var(--line-subtle)]" />
      <div className="p-1.5">
        <div className="mb-1 h-2 w-3/4 animate-pulse rounded bg-[var(--line-subtle)]" />
        <div className="h-1.5 w-1/2 animate-pulse rounded bg-[var(--line-subtle)]" />
      </div>
      <div className="absolute inset-x-0 top-1 flex items-center justify-center">
        <span className="text-xs font-medium text-[var(--fg-quaternary)]">{index + 1}</span>
      </div>
    </div>
  );
}

export const CutStoryThumb = memo(function CutStoryThumb({
  cut,
  index,
  selected,
  reviewable = false,
  decision,
  onSelect,
  onApprove,
  onReject,
}: CutStoryThumbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasRendered = Boolean(cut.cutFileId);

  const clipPreview = useCutClipPreviewUrl(hasRendered ? cut : null, hasRendered);
  const clipUrl = useStableMediaUrl(cut.cutFileId ?? null, clipPreview.data?.url ?? null);

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

  const isApproved = decision === "approve";
  const isRejected = decision === "reject";

  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-[var(--r-md)] transition-all duration-150",
        "border-2",
        selected
          ? "border-[var(--accent)]"
          : "border-transparent hover:border-[var(--line-subtle)]",
        isApproved && "ring-2 ring-green-500/60",
        isRejected && "ring-2 ring-[var(--danger)]/60 opacity-60",
      )}
      onClick={onSelect}
    >
      {!hasRendered ? (
        <CutSkeleton index={index} />
      ) : (
        <div className="relative aspect-[9/16] w-full bg-black">
          {clipUrl ? (
            <video
              ref={videoRef}
              src={clipUrl}
              className="size-full object-cover"
              preload="metadata"
              muted
              playsInline
              aria-label={cut.title}
            />
          ) : (
            <div className="size-full animate-pulse bg-[var(--bg-elevated)]" />
          )}

          {isApproved ? (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
              <Check className="size-6 text-green-400" strokeWidth={3} />
            </div>
          ) : isRejected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--danger)]/20">
              <X className="size-6 text-[var(--danger)]" strokeWidth={3} />
            </div>
          ) : null}

          <div className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
            {index + 1}
          </div>

          {reviewable && (onApprove || onReject) ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
              {onReject ? (
                <button
                  type="button"
                  aria-label="Reject"
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors",
                    isRejected
                      ? "bg-[var(--danger)] text-white"
                      : "bg-white/20 text-white hover:bg-[var(--danger)] hover:text-white",
                  )}
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
              {onApprove ? (
                <button
                  type="button"
                  aria-label="Approve"
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors",
                    isApproved
                      ? "bg-green-500 text-white"
                      : "bg-white/20 text-white hover:bg-green-500 hover:text-white",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {hasRendered ? (
        <div className="p-1.5">
          <p className="line-clamp-1 text-xs font-medium text-[var(--fg-secondary)]">{cut.title}</p>
        </div>
      ) : null}
    </div>
  );
});
