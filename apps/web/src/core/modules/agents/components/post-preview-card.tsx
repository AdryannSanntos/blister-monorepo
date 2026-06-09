"use client";

import { IconSparkles } from "@tabler/icons-react";
import { ArrowUpRight, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { memo, useCallback } from "react";

import { cn } from "@/components/agent-elements/utils/cn";
import { Badge } from "@/core/shared/components/ui/badge";

import { PostSlidePreview } from "./post-slide-preview";

const CHAT_PREVIEW_MAX_WIDTH = 80;

type PostPreviewCardProps = {
  slides: string[];
  platform?: string;
  width: number;
  height: number;
  caption?: string;
  hashtags?: string[];
  onOpenPreview: () => void;
};

export const PostPreviewCard = memo(function PostPreviewCard({
  slides,
  platform,
  width,
  height,
  caption,
  hashtags = [],
  onOpenPreview,
}: PostPreviewCardProps) {
  const tReview = useTranslations("agents.review");
  const tp = useTranslations("agents.postPreview");

  const total = slides.length;
  const previewTitle = platform ?? tp("postTitle");
  const firstSlide = slides[0];

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpenPreview();
      }
    },
    [onOpenPreview],
  );

  if (!firstSlide) return null;

  return (
    <div className="overflow-hidden rounded-an-message border border-[var(--line-subtle)] bg-[var(--bg-base)]">
      <div className="flex items-center gap-1.5 px-4 pt-3">
        <IconSparkles className="size-3.5 shrink-0 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--fg-tertiary)]">
          {tReview("title")}
        </span>
      </div>

      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={onOpenPreview}
          onKeyDown={handleKeyDown}
          aria-label={tp("openPreview")}
          className={cn(
            "group/preview flex w-full cursor-pointer items-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-raised)] px-3 py-3 text-left",
            "transition-[border-color,background-color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
            "hover:-translate-y-px hover:border-[color-mix(in_oklch,var(--accent)_35%,var(--line-subtle))] hover:bg-[var(--bg-hover)] hover:shadow-[var(--shadow-sm)]",
            "active:scale-[0.995] active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
          )}
        >
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-1",
              "ring-1 ring-[var(--line-subtle)] transition-[ring-color,box-shadow] duration-[var(--dur-fast)]",
              "group-hover/preview:ring-[color-mix(in_oklch,var(--accent)_30%,var(--line-subtle))] group-hover/preview:shadow-[var(--shadow-xs)]",
            )}
          >
            <PostSlidePreview
              html={firstSlide}
              width={width}
              height={height}
              maxWidth={CHAT_PREVIEW_MAX_WIDTH}
            />
            <span
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--r-sm)]",
                "bg-[color-mix(in_oklch,var(--bg-canvas)_50%,transparent)] backdrop-blur-[1px]",
                "opacity-0 transition-opacity duration-[var(--dur-fast)]",
                "group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100",
              )}
            >
              <span className="inline-flex size-7 items-center justify-center rounded-[var(--r-full)] bg-[var(--bg-overlay)] text-[var(--fg-primary)] shadow-[var(--shadow-sm)]">
                <Maximize2 className="size-3.5" aria-hidden />
              </span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
              {previewTitle}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] tabular-nums text-[var(--fg-tertiary)]">
                {width}×{height}
              </span>
              {total > 1 ? (
                <Badge variant="accent" className="h-5 px-2 text-[10px]">
                  {tp("slideCounter", { current: 1, total })}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-[12px] font-medium text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] group-hover/preview:text-[var(--accent)]">
              {tp("viewPost")}
            </p>
          </div>

          <ArrowUpRight
            className="size-4 shrink-0 text-[var(--fg-quaternary)] transition-[color,transform] duration-[var(--dur-fast)] group-hover/preview:translate-x-0.5 group-hover/preview:-translate-y-0.5 group-hover/preview:text-[var(--accent)]"
            aria-hidden
          />
        </button>
      </div>

      {caption || hashtags.length > 0 ? (
        <div className="border-t border-[var(--line-subtle)] px-4 py-3.5">
          {caption ? (
            <p className="whitespace-pre-wrap text-[14px] leading-[1.55] text-[var(--fg-primary)]">
              {caption}
            </p>
          ) : null}
          {hashtags.length > 0 ? (
            <p
              className={cn(
                "text-[13px] leading-snug text-[var(--accent)]",
                caption ? "mt-2" : undefined,
              )}
            >
              {hashtags
                .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                .join(" ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
