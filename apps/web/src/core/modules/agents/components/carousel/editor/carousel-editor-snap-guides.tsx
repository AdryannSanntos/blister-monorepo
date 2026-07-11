"use client";

import type { SnapGuide } from "./carousel-editor-snap";

interface Props {
  guides: SnapGuide[];
  /** Outer canvas scale (iframe px × scale = outer px). */
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const CarouselSnapGuides = ({ guides, scale, canvasWidth, canvasHeight }: Props) => {
  if (guides.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 9999 }}
      aria-hidden
    >
      {guides.map((g, i) =>
        g.axis === "x" ? (
          // vertical guide line (constant x)
          <line
            key={i}
            x1={g.position * scale}
            y1={0}
            x2={g.position * scale}
            y2={canvasHeight}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ) : (
          // horizontal guide line (constant y)
          <line
            key={i}
            x1={0}
            y1={g.position * scale}
            x2={canvasWidth}
            y2={g.position * scale}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ),
      )}
    </svg>
  );
};
