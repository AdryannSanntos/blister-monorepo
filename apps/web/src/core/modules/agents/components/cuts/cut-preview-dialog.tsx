"use client";

import type { CutOutput, CutsTranscriptSegment } from "@company-os/types";
import type { MediaPlayerInstance } from "@vidstack/react";
import { Check, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CutStoryPlayer } from "src/core/modules/agents/components/cuts/cut-story-player";
import { CutTranscriptPanel } from "src/core/modules/agents/components/cuts/cut-transcript-panel";
import { seekCutPlayer } from "src/core/modules/agents/components/cuts/players/seek-cut-player";
import { TranscriptProgressBar } from "src/core/modules/agents/components/cuts/transcript-progress-bar";
import { formatCutWindow } from "src/core/modules/agents/utils/cuts-display";
import { prepareCutTranscriptSegments } from "src/core/modules/agents/utils/prepare-cut-transcript-segments";
import { viralScoreBadgeVariant } from "src/core/modules/agents/utils/viral-score";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

type CutPreviewDialogProps = {
  open: boolean;
  cut: CutOutput | null;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  transcript?: CutsTranscriptSegment[];
  fallbackPlayerSrc?: string | null;
  fallbackPlayerResourceKey?: string | null;
  isResolvingSource?: boolean;
  reviewable?: boolean;
  decision?: CutDecision;
  onOpenChange: (open: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

type MobileTab = "video" | "transcript";

const topNavButtonClass =
  "flex size-8 items-center justify-center rounded-[var(--r-md)] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] disabled:pointer-events-none disabled:opacity-40";

const ShortcutHint = ({ keys, label }: { keys: string[]; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    {keys.map((key) => (
      <kbd
        key={key}
        className="inline-flex min-w-5 items-center justify-center rounded-[var(--r-sm)] border border-[var(--line-subtle)] bg-[var(--bg-raised)] px-1 py-0.5 font-mono text-[10px] text-[var(--fg-tertiary)]"
      >
        {key}
      </kbd>
    ))}
    <span className="text-[11px] text-[var(--fg-quaternary)]">{label}</span>
  </span>
);

export const CutPreviewDialog = ({
  open,
  cut,
  index,
  total,
  hasPrev,
  hasNext,
  transcript = [],
  fallbackPlayerSrc,
  fallbackPlayerResourceKey,
  isResolvingSource,
  reviewable = false,
  decision,
  onOpenChange,
  onPrev,
  onNext,
  onApprove,
  onReject,
}: CutPreviewDialogProps) => {
  const t = useTranslations("cuts.review");
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [currentClipSec, setCurrentClipSec] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("video");

  const cutId = cut?.id ?? null;

  // Rendered clips start at 0; source-relative time = cut.startSec + clipTime.
  // The source fallback plays with clip bounds, so its time is already source-relative.
  const usesRenderedClip = Boolean(cut?.cutFileId);
  const clipBaseSec = usesRenderedClip ? (cut?.startSec ?? 0) : 0;
  const currentSourceSec = clipBaseSec + currentClipSec;

  // Reset playback tracking when switching cuts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the timer whenever the cut changes
  useEffect(() => {
    setCurrentClipSec(0);
    setMobileTab("video");
  }, [cutId]);

  const cutTranscript = useMemo(() => {
    if (!cut) return [];
    return prepareCutTranscriptSegments(transcript, cut.startSec, cut.endSec);
  }, [transcript, cut]);

  const handleTimeUpdate = useCallback((seconds: number) => {
    setCurrentClipSec(seconds);
  }, []);

  const handleSeek = useCallback(
    (sourceSec: number) => {
      const player = playerRef.current;
      if (!player) return;

      if (usesRenderedClip) {
        const clipRelativeSec = Math.max(0, sourceSec - clipBaseSec);
        seekCutPlayer(player, { clipRelativeSec });
        setCurrentClipSec(clipRelativeSec);
        return;
      }

      seekCutPlayer(player, {
        clipRelativeSec: 0,
        sourceAbsoluteSec: sourceSec,
      });
      setCurrentClipSec(sourceSec);
    },
    [clipBaseSec, usesRenderedClip],
  );

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    // The player remounts on every cut switch (key={cutId}); a stale ref can
    // point at a torn-down instance whose reactive state is already disposed.
    // Reading `paused` on it throws a Maverick "$state[prop] is not a function"
    // error, so bail unless the element is still connected and guard the access.
    if (!player?.el?.isConnected) return;
    try {
      if (player.paused) {
        void player.play().catch(() => undefined);
      } else {
        player.pause();
      }
    } catch {
      // Player is mid-teardown — ignore.
    }
  }, []);

  const activeSegmentIndex = useMemo(
    () =>
      cutTranscript.findIndex(
        (segment) =>
          currentSourceSec >= segment.startSec &&
          currentSourceSec < segment.endSec,
      ),
    [cutTranscript, currentSourceSec],
  );

  const jumpToSegment = useCallback(
    (direction: 1 | -1) => {
      if (cutTranscript.length === 0) return;
      const base = activeSegmentIndex >= 0 ? activeSegmentIndex : 0;
      const target = Math.min(
        cutTranscript.length - 1,
        Math.max(0, base + direction),
      );
      const segment = cutTranscript[target];
      if (segment) handleSeek(segment.startSec);
    },
    [cutTranscript, activeSegmentIndex, handleSeek],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;

      switch (event.key) {
        case "ArrowLeft":
          if (hasPrev) {
            event.preventDefault();
            onPrev();
          }
          break;
        case "ArrowRight":
          if (hasNext) {
            event.preventDefault();
            onNext();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          jumpToSegment(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          jumpToSegment(1);
          break;
        case " ":
        case "Spacebar":
          // Let focused buttons activate natively instead of toggling playback.
          if (target?.closest("button, [role='button']")) return;
          event.preventDefault();
          togglePlay();
          break;
        default:
          break;
      }
    },
    [hasPrev, hasNext, onPrev, onNext, jumpToSegment, togglePlay],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  const isApproved = decision === "approve";
  const isRejected = decision === "reject";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="cut-preview-dialog"
        className="flex max-h-[92vh] w-fit max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(72rem,calc(100%-2rem))]"
      >
        <DialogTitle className="sr-only">
          {cut?.title ?? t("previewLabel")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("previewLabel")}
        </DialogDescription>

        {/* ── Compact top bar ───────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line-default)] px-3 py-2 sm:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label={t("prev")}
              className={topNavButtonClass}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[3.5rem] text-center font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label={t("next")}
              className={topNavButtonClass}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {cut ? (
            <div className="flex items-center gap-2">
              <Badge
                variant={viralScoreBadgeVariant(cut.viralScore)}
                className="tabular-nums"
              >
                {t("viralScore", { score: cut.viralScore })}
              </Badge>
              <Badge
                variant="outline"
                className="hidden gap-1 font-mono tabular-nums sm:inline-flex"
              >
                <Clock className="size-3" />
                {formatCutWindow(cut.startSec, cut.endSec)}
              </Badge>
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {reviewable && cut && onReject ? (
              <Button
                type="button"
                variant={isRejected ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={onReject}
              >
                <X className="size-4" />
                <span className="hidden sm:inline">{t("reject")}</span>
              </Button>
            ) : null}
            {reviewable && cut && onApprove ? (
              <Button
                type="button"
                variant={isApproved ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5",
                  isApproved &&
                    "border-[var(--success)] bg-[var(--success)] text-white hover:bg-[var(--success)]",
                )}
                onClick={onApprove}
              >
                <Check className="size-4" />
                <span className="hidden sm:inline">{t("approve")}</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* ── Mobile tabs ───────────────────────────────────────── */}
        <div className="flex shrink-0 border-b border-[var(--line-default)] lg:hidden">
          {(["video", "transcript"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              aria-pressed={mobileTab === tab}
              className={cn(
                "flex-1 px-4 py-2 text-[13px] font-medium transition-colors",
                mobileTab === tab
                  ? "border-b-2 border-[var(--accent)] text-[var(--fg-primary)]"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-secondary)]",
              )}
            >
              {t(tab === "video" ? "tabVideo" : "tabTranscript")}
            </button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 overflow-hidden lg:h-[min(78vh,calc(92vh-6rem))] lg:grid-cols-[auto_minmax(26rem,28rem)]">
          {/* Player */}
          <div
            className={cn(
              "relative min-h-0 w-full flex-col bg-[var(--bg-canvas)] p-4 lg:flex lg:w-[calc(78vh*9/16+3rem)] lg:shrink-0 lg:p-6",
              mobileTab === "video" ? "flex" : "hidden",
            )}
          >
            <CutStoryPlayer
              cut={cut}
              fallbackSrc={fallbackPlayerSrc}
              fallbackResourceKey={fallbackPlayerResourceKey}
              isResolvingSource={isResolvingSource}
              variant="minimal"
              hideMeta
              playerRef={playerRef}
              onTimeUpdate={handleTimeUpdate}
              className="h-[56vh] max-h-full min-h-0 w-full flex-1 lg:h-auto"
            />
          </div>

          {/* Details + transcript */}
          <div
            className={cn(
              "min-h-0 flex-col overflow-hidden border-t border-[var(--line-default)] bg-[var(--bg-base)] lg:flex lg:border-l lg:border-t-0",
              mobileTab === "transcript" ? "flex" : "hidden",
            )}
          >
            {cut ? (
              <div className="flex shrink-0 flex-col gap-1 px-5 pb-2 pt-4">
                <p className="line-clamp-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--fg-primary)]">
                  {cut.title}
                </p>
                {cut.description?.trim() ? (
                  <Paragraph
                    size="p5"
                    tone="tertiary"
                    className="line-clamp-2 leading-relaxed"
                  >
                    {cut.description}
                  </Paragraph>
                ) : null}
              </div>
            ) : null}

            {cut ? (
              <TranscriptProgressBar
                className="shrink-0 px-5 pb-1"
                segments={cutTranscript}
                startSec={cut.startSec}
                endSec={cut.endSec}
                currentSourceSec={currentSourceSec}
                onSeek={handleSeek}
              />
            ) : null}

            <CutTranscriptPanel
              className="min-h-0 flex-1"
              segments={cutTranscript}
              clipStartSec={cut?.startSec ?? 0}
              currentSourceSec={currentSourceSec}
              onSeek={handleSeek}
            />
          </div>
        </div>

        {/* ── Shortcut hints ────────────────────────────────────── */}
        <div className="hidden shrink-0 items-center gap-4 border-t border-[var(--line-subtle)] px-4 py-2 lg:flex">
          <ShortcutHint keys={["Space"]} label={t("hintPlay")} />
          <ShortcutHint keys={["←", "→"]} label={t("hintCuts")} />
          <ShortcutHint keys={["↑", "↓"]} label={t("hintLines")} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
