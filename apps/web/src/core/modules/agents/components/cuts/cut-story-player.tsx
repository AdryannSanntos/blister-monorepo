"use client";

import type { CutOutput } from "@company-os/types";
import type { MediaPlayerInstance } from "@vidstack/react";
import { Film, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, type Ref } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { useStablePlaybackSrc } from "src/core/modules/agents/hooks/use-stable-playback-src";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";
import { MinimalPlayer } from "./players/minimal-player";
import { playerFrameClassName } from "./players/player-orientation";
import { StoryPlayer } from "./players/story-player";

export type PlayerVariant = "story" | "minimal";

type CutStoryPlayerProps = {
  fallbackSrc?: string | null;
  fallbackResourceKey?: string | null;
  cut: CutOutput | null;
  isResolvingSource?: boolean;
  hideMeta?: boolean;
  variant?: PlayerVariant;
  className?: string;
  playerRef?: Ref<MediaPlayerInstance>;
  /** Fires on playback progress with the current time in seconds. */
  onTimeUpdate?: (currentTimeSec: number) => void;
};

export const CutStoryPlayer = memo(function CutStoryPlayer({
  fallbackSrc,
  fallbackResourceKey,
  cut,
  isResolvingSource,
  hideMeta = false,
  variant = "story",
  className,
  playerRef,
  onTimeUpdate,
}: CutStoryPlayerProps) {
  const t = useTranslations("cuts.review");

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

  const activeSrc = usesRenderedClip && clipUrl ? clipUrl : (sourceUrl ?? null);
  const playbackSrc = useStablePlaybackSrc(cut?.id ?? null, activeSrc);
  const isLoading =
    !playbackSrc &&
    (usesRenderedClip ? clipPreview.isLoading : Boolean(isResolvingSource));

  const PlayerComponent = variant === "minimal" ? MinimalPlayer : StoryPlayer;
  const frameClassName = playerFrameClassName("vertical");

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-4", className)}
      data-testid="cut-story-player"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-4">
        <div className={frameClassName}>
          {playbackSrc && cut ? (
            <PlayerComponent
              src={playbackSrc}
              cutId={cut.id}
              startSec={usesRenderedClip ? 0 : cut.startSec}
              endSec={usesRenderedClip ? undefined : cut.endSec}
              orientation="vertical"
              className="size-full"
              playerRef={playerRef}
              onTimeUpdate={onTimeUpdate}
            />
          ) : isLoading ? (
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
              <Film
                className="size-8 text-[var(--fg-quaternary)]"
                aria-hidden
              />
              <Paragraph size="p6" tone="tertiary">
                {t("selectCutHint")}
              </Paragraph>
            </div>
          )}
        </div>
      </div>

      {cut && !hideMeta ? (
        <div className="shrink-0 space-y-2 border-t border-[var(--line-subtle)] pt-4">
          <Paragraph size="p3" tone="primary" className="font-medium">
            {cut.title}
          </Paragraph>
          <Paragraph
            size="p6"
            tone="tertiary"
            className="font-mono tabular-nums"
          >
            {`${Math.floor(cut.startSec / 60)}:${String(Math.floor(cut.startSec % 60)).padStart(2, "0")} → ${Math.floor(cut.endSec / 60)}:${String(Math.floor(cut.endSec % 60)).padStart(2, "0")}`}
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
