"use client";

import type { CarouselOutputSlide, CarouselSocialNetwork } from "@company-os/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CarouselSlideRenderer,
  computeCarouselPreviewFrameSize,
} from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { CarouselSocialNetworkIcon } from "src/core/modules/agents/components/carousel/carousel-social-network-icon";
import { getCarouselSlideReactKey } from "src/core/modules/agents/utils/carousel-run-display";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { cn } from "src/core/shared/utils";

const THUMB_WIDTH = 72;
const SWIPE_THRESHOLD = 48;

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

type CarouselPreviewDialogProps = {
  open: boolean;
  slides: CarouselOutputSlide[];
  initialIndex?: number;
  socialNetwork?: CarouselSocialNetwork;
  onOpenChange: (open: boolean) => void;
};

export const CarouselPreviewDialog = ({
  open,
  slides,
  initialIndex = 0,
  socialNetwork = "instagram",
  onOpenChange,
}: CarouselPreviewDialogProps) => {
  const t = useTranslations("carousel.preview");
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [frameSize, setFrameSize] = useState({ width: 480, height: 600 });
  const touchStartX = useRef<number | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const activeSlide = slides[activeIndex] ?? null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < total - 1;

  const updateFrameSize = useCallback(() => {
    setFrameSize(
      computeCarouselPreviewFrameSize(window.innerWidth, window.innerHeight),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)));
    setDirection(0);
    updateFrameSize();
    window.addEventListener("resize", updateFrameSize);
    return () => window.removeEventListener("resize", updateFrameSize);
  }, [open, initialIndex, total, updateFrameSize]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total || index === activeIndex) return;
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex, total],
  );

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    goTo(activeIndex - 1);
  }, [activeIndex, goTo, hasPrev]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    goTo(activeIndex + 1);
  }, [activeIndex, goTo, hasNext]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;

      switch (event.key) {
        case "ArrowLeft":
          if (hasPrev) {
            event.preventDefault();
            goPrev();
          }
          break;
        case "ArrowRight":
          if (hasNext) {
            event.preventDefault();
            goNext();
          }
          break;
        default:
          break;
      }
    },
    [goNext, goPrev, hasNext, hasPrev],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open || !thumbStripRef.current) return;
    const thumb = thumbStripRef.current.querySelector<HTMLElement>(
      `[data-thumb-index="${activeIndex}"]`,
    );
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex, open]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD) goPrev();
    if (delta < -SWIPE_THRESHOLD) goNext();
    touchStartX.current = null;
  };

  const slideVariants = {
    enter: (slideDirection: number) => ({
      x: slideDirection >= 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (slideDirection: number) => ({
      x: slideDirection >= 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="carousel-preview-dialog"
        showCloseButton={false}
        className="flex max-h-[96vh] w-auto max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
        style={{ width: frameSize.width + 32 }}
      >
        <DialogTitle className="sr-only">{t("dialogTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("dialogDescription")}
        </DialogDescription>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line-default)] px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label={t("prevSlide")}
              className={topNavButtonClass}
              data-testid="carousel-preview-prev"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span
              className="min-w-[4.5rem] text-center font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]"
              data-testid="carousel-preview-counter"
            >
              {t("slideOf", { current: activeIndex + 1, total })}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              aria-label={t("nextSlide")}
              className={topNavButtonClass}
              data-testid="carousel-preview-next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--line-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-secondary)]">
              <CarouselSocialNetworkIcon network={socialNetwork} className="size-3.5" />
              <span className="capitalize">{socialNetwork}</span>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t("close")}
                className={topNavButtonClass}
                data-testid="carousel-preview-close"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div
          className="relative flex shrink-0 flex-col items-center justify-center bg-[var(--bg-canvas)] px-4 py-5 sm:px-5 sm:py-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative shrink-0 overflow-hidden rounded-[var(--r-xl)] shadow-[var(--shadow-xl)] ring-1 ring-white/10"
            style={{ width: frameSize.width, height: frameSize.height }}
            data-testid="carousel-preview-frame"
          >
            <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex gap-1">
              {slides.map((slide, index) => (
                <div
                  key={getCarouselSlideReactKey(slide, index)}
                  className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-white transition-all duration-300",
                      index < activeIndex && "w-full",
                      index === activeIndex && "w-full",
                      index > activeIndex && "w-0",
                    )}
                  />
                </div>
              ))}
            </div>

            <AnimatePresence initial={false} custom={direction} mode="wait">
              {activeSlide ? (
                <motion.div
                  key={getCarouselSlideReactKey(activeSlide, activeIndex)}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute inset-0 size-full"
                >
                  <CarouselSlideRenderer slide={activeSlide} fill title={`Slide ${activeSlide.order}`} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {hasPrev ? (
              <button
                type="button"
                aria-label={t("prevSlide")}
                onClick={goPrev}
                className="absolute inset-y-0 left-0 z-10 w-[22%] cursor-w-resize bg-gradient-to-r from-black/25 to-transparent opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              />
            ) : null}
            {hasNext ? (
              <button
                type="button"
                aria-label={t("nextSlide")}
                onClick={goNext}
                className="absolute inset-y-0 right-0 z-10 w-[22%] cursor-e-resize bg-gradient-to-l from-black/25 to-transparent opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              />
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={getCarouselSlideReactKey(slide, index)}
                type="button"
                aria-label={t("goToSlide", { order: slide.order })}
                aria-current={index === activeIndex ? "step" : undefined}
                onClick={() => goTo(index)}
                className={cn(
                  "rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "size-2 bg-[var(--accent)]"
                    : "size-1.5 bg-[var(--fg-quaternary)] hover:bg-[var(--fg-tertiary)]",
                )}
              />
            ))}
          </div>
        </div>

        {total > 1 ? (
          <div
            ref={thumbStripRef}
            className="flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3"
          >
            {slides.map((slide, index) => (
              <button
                key={getCarouselSlideReactKey(slide, index)}
                type="button"
                data-thumb-index={index}
                aria-label={t("openSlide", { order: slide.order })}
                onClick={() => goTo(index)}
                className={cn(
                  "shrink-0 overflow-hidden rounded-[var(--r-md)] border-2 transition-all duration-150",
                  index === activeIndex
                    ? "border-[var(--accent)] shadow-[var(--shadow-sm)]"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <CarouselSlideRenderer
                  slide={slide}
                  displayWidth={THUMB_WIDTH}
                  className="rounded-[calc(var(--r-md)-2px)]"
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="hidden shrink-0 items-center gap-4 border-t border-[var(--line-subtle)] px-4 py-2 sm:flex">
          <ShortcutHint keys={["←", "→"]} label={t("hintNav")} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
