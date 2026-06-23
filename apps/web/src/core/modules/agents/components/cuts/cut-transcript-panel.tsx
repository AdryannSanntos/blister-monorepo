"use client";

import type { CutsTranscriptSegment } from "@company-os/types";
import { Captions } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useMemo, useRef } from "react";

import { TranscriptWord } from "src/core/modules/agents/components/cuts/transcript-word";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type CutTranscriptPanelProps = {
  segments: CutsTranscriptSegment[];
  /** Start of the cut in source-video seconds — reserved for future labels. */
  clipStartSec?: number;
  /** Current playback position mapped to source-video seconds. */
  currentSourceSec: number;
  onSeek: (sourceSec: number) => void;
  className?: string;
};

/** Brand chart tokens cycled to give each speaker a stable color. */
const SPEAKER_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-8)",
];

/** Smoothly centers the active line within its scroll container (lyrics-style). */
const scrollActiveLineToCenter = (
  container: HTMLElement,
  active: HTMLElement,
): void => {
  const containerRect = container.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const activeTop = activeRect.top - containerRect.top + container.scrollTop;
  const target = activeTop - (container.clientHeight - active.offsetHeight) / 2;
  const nextScrollTop = Math.max(0, target);

  if (typeof container.scrollTo === "function") {
    container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
    return;
  }
  container.scrollTop = nextScrollTop;
};

export const CutTranscriptPanel = ({
  segments,
  currentSourceSec,
  onSeek,
  className,
}: CutTranscriptPanelProps) => {
  const t = useTranslations("cuts.review");
  const scrollContainerRef = useRef<HTMLOListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const speakerColor = useMemo(() => {
    const map = new Map<string, string>();
    let next = 0;
    for (const segment of segments) {
      if (segment.speaker && !map.has(segment.speaker)) {
        map.set(segment.speaker, SPEAKER_COLORS[next % SPEAKER_COLORS.length]);
        next += 1;
      }
    }
    return map;
  }, [segments]);

  const activeIndex = useMemo(
    () =>
      segments.findIndex(
        (segment) =>
          currentSourceSec >= segment.startSec &&
          currentSourceSec < segment.endSec,
      ),
    [segments, currentSourceSec],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-center whenever the active line index changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    scrollActiveLineToCenter(container, active);
  }, [activeIndex]);

  if (segments.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center",
          className,
        )}
      >
        <Captions className="size-6 text-[var(--fg-quaternary)]" aria-hidden />
        <Paragraph size="p6" tone="tertiary">
          {t("transcriptEmpty")}
        </Paragraph>
      </div>
    );
  }

  return (
    <ol
      ref={scrollContainerRef}
      data-testid="cut-transcript"
      className={cn(
        "relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-5 py-[35%] [scrollbar-gutter:stable]",
        className,
      )}
    >
      {segments.map((segment, index) => {
        const isActive = index === activeIndex;
        const isPast = activeIndex >= 0 && index < activeIndex;
        const color = segment.speaker
          ? speakerColor.get(segment.speaker)
          : undefined;
        const words = segment.words;

        return (
          <li
            key={segment.id ?? `${segment.startSec}-${index}`}
            ref={isActive ? activeRef : undefined}
            aria-current={isActive ? "true" : undefined}
          >
            {/* The line is clickable (seek to its start) yet wraps individually
                clickable word buttons, so it cannot be a native <button>. It is
                keyboard-reachable via tabIndex + Enter. */}
            {/* biome-ignore lint/a11y/useSemanticElements: line wraps nested word buttons; a real button would be invalid */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSeek(segment.startSec)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSeek(segment.startSec);
              }}
              className={cn(
                "cursor-pointer rounded-[var(--r-md)] px-2 py-2 text-[15px] leading-[1.6] outline-none transition-[opacity,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:bg-[var(--bg-raised)]",
                isActive
                  ? "font-medium text-[var(--fg-primary)] opacity-100"
                  : isPast
                    ? "text-[var(--fg-tertiary)] opacity-30 hover:opacity-60"
                    : "text-[var(--fg-secondary)] opacity-55 hover:opacity-80",
              )}
            >
              {segment.speaker ? (
                <span className="mr-2 inline-flex translate-y-[-1px] items-center gap-1.5 align-middle">
                  <span
                    className="size-2 shrink-0 rounded-[var(--r-full)]"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-quaternary)]">
                    {t("speakerLabel", { label: segment.speaker })}
                  </span>
                </span>
              ) : null}

              {words && words.length > 0 ? (
                words.map((word, wordIndex) => {
                  const isActiveWord =
                    isActive &&
                    currentSourceSec >= word.startSec &&
                    currentSourceSec < word.endSec;
                  const isSpokenWord =
                    isPast || (isActive && currentSourceSec >= word.endSec);
                  return (
                    <Fragment key={`${word.startSec}-${wordIndex}`}>
                      <TranscriptWord
                        text={word.text}
                        startSec={word.startSec}
                        isActive={isActiveWord}
                        isSpoken={isSpokenWord}
                        onSeek={onSeek}
                      />{" "}
                    </Fragment>
                  );
                })
              ) : (
                <span className="whitespace-pre-wrap">{segment.text}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
