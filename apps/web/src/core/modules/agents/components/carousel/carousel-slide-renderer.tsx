"use client";

import type { CarouselOutputSlide } from "@company-os/types";
import { useEffect, useRef, useState } from "react";

import { cn } from "src/core/shared/utils";

export const CAROUSEL_SLIDE_WIDTH = 1080;
export const CAROUSEL_SLIDE_HEIGHT = 1350;
export const CAROUSEL_SLIDE_ASPECT = CAROUSEL_SLIDE_WIDTH / CAROUSEL_SLIDE_HEIGHT;

export const buildCarouselSlideSrcDoc = (slide: CarouselOutputSlide) =>
  `<!doctype html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;width:${CAROUSEL_SLIDE_WIDTH}px;height:${CAROUSEL_SLIDE_HEIGHT}px}${slide.cssContent}</style></head><body>${slide.htmlContent}</body></html>`;

type CarouselSlideRendererProps = {
  slide: CarouselOutputSlide;
  /** Fixed width in px. Ignored when `fill` is true. */
  displayWidth?: number;
  /** Fill the parent box and scale from its measured width. */
  fill?: boolean;
  className?: string;
  title?: string;
};

export const CarouselSlideRenderer = ({
  slide,
  displayWidth = 280,
  fill = false,
  className,
  title,
}: CarouselSlideRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(displayWidth);

  useEffect(() => {
    if (!fill || !containerRef.current) return;
    const node = containerRef.current;
    const update = () => {
      const next = node.clientWidth;
      if (next > 0) setMeasuredWidth(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fill]);

  const width = fill ? measuredWidth : displayWidth;
  const height = Math.round(width / CAROUSEL_SLIDE_ASPECT);
  const scale = width / CAROUSEL_SLIDE_WIDTH;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-black",
        fill && "size-full min-h-0 min-w-0",
        className,
      )}
      style={fill ? undefined : { width, height }}
    >
      <iframe
        srcDoc={buildCarouselSlideSrcDoc(slide)}
        title={title ?? `Slide ${slide.order}`}
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 border-none"
        style={{
          width: CAROUSEL_SLIDE_WIDTH,
          height: CAROUSEL_SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
};

/** Computes the largest 4:5 frame that fits in the viewport with modal chrome. */
export const computeCarouselPreviewFrameSize = (
  viewportWidth: number,
  viewportHeight: number,
  options?: { chromeHeight?: number; maxWidth?: number; maxHeight?: number },
) => {
  const chromeHeight = options?.chromeHeight ?? 210;
  const maxWidth = options?.maxWidth ?? 600;
  const maxHeight = options?.maxHeight ?? 780;

  const heightBudget = Math.min(
    viewportHeight * 0.8,
    viewportHeight - chromeHeight,
    maxHeight,
  );
  const widthBudget = Math.min(viewportWidth - 32, maxWidth);

  let width = Math.floor(
    Math.min(widthBudget, heightBudget * CAROUSEL_SLIDE_ASPECT),
  );
  width = Math.max(width, 280);
  const height = Math.floor(width / CAROUSEL_SLIDE_ASPECT);

  return { width, height };
};
