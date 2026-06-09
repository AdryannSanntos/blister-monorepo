"use client";

import { memo, useEffect, useRef, useState } from "react";

import { cn } from "@/components/agent-elements/utils/cn";

type PostSlidePreviewProps = {
  html: string;
  width: number;
  height: number;
  /** Caps the preview width; height follows aspect ratio. */
  maxWidth?: number;
  className?: string;
};

/**
 * Renders a single slide's HTML inside a sandboxed iframe at the platform's
 * real dimensions, scaled down (never up) to fit the container while keeping
 * the exact aspect ratio.
 */
export const PostSlidePreview = memo(function PostSlidePreview({
  html,
  width,
  height,
  maxWidth,
  className,
}: PostSlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const effectiveWidth =
    maxWidth !== undefined
      ? Math.min(containerWidth || maxWidth, maxWidth)
      : containerWidth;
  const scale = effectiveWidth > 0 ? Math.min(1, effectiveWidth / width) : 0;

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full justify-center", className)}
      style={maxWidth !== undefined ? { maxWidth } : undefined}
    >
      {scale > 0 ? (
        <div
          className="relative overflow-hidden rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-white"
          style={{ width: width * scale, height: height * scale }}
        >
          <iframe
            title="Post preview"
            sandbox=""
            srcDoc={html}
            style={{
              width,
              height,
              border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : null}
    </div>
  );
});
