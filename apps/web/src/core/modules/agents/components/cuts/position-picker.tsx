"use client";

import { useRef } from "react";

import { cn } from "src/core/shared/utils";

type Point = { x: number; y: number };

type PositionPickerProps = {
  showTitle: boolean;
  showCaption: boolean;
  titlePosition: Point;
  captionPosition: Point;
  onTitleChange: (point: Point) => void;
  onCaptionChange: (point: Point) => void;
  labels: { title: string; caption: string; hint: string };
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * 9:16 preview with draggable Title (T) and Caption (C) handles. Emits the
 * handle center as a normalized {x,y} in [0,1]. Pointer events only — no DnD lib.
 */
export function PositionPicker({
  showTitle,
  showCaption,
  titlePosition,
  captionPosition,
  onTitleChange,
  onCaptionChange,
  labels,
}: PositionPickerProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  const startDrag =
    (onChange: (point: Point) => void) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      const move = (clientX: number, clientY: number) => {
        const frame = frameRef.current;
        if (!frame) return;
        const rect = frame.getBoundingClientRect();
        onChange({
          x: clamp01((clientX - rect.left) / rect.width),
          y: clamp01((clientY - rect.top) / rect.height),
        });
      };

      const onMove = (e: PointerEvent) => move(e.clientX, e.clientY);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

  const handleClass =
    "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full text-[12px] font-bold text-white shadow-md active:cursor-grabbing";

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={frameRef}
        className="relative mx-auto aspect-[9/16] w-[150px] overflow-hidden rounded-[var(--r-md)] border border-[var(--line-default)] bg-gradient-to-b from-[#1a1d28] to-[#0d0f18]"
      >
        {/* safe-area guides */}
        <div className="pointer-events-none absolute inset-x-3 inset-y-4 rounded border border-dashed border-white/10" />

        {showTitle ? (
          <button
            type="button"
            aria-label={labels.title}
            onPointerDown={startDrag(onTitleChange)}
            className={cn(handleClass, "bg-[var(--accent)]")}
            style={{
              left: `${titlePosition.x * 100}%`,
              top: `${titlePosition.y * 100}%`,
            }}
          >
            T
          </button>
        ) : null}

        {showCaption ? (
          <button
            type="button"
            aria-label={labels.caption}
            onPointerDown={startDrag(onCaptionChange)}
            className={cn(handleClass, "bg-[var(--primary)]")}
            style={{
              left: `${captionPosition.x * 100}%`,
              top: `${captionPosition.y * 100}%`,
            }}
          >
            C
          </button>
        ) : null}
      </div>
      <p className="text-center text-[11px] text-[var(--fg-tertiary)]">{labels.hint}</p>
    </div>
  );
}
