"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
} from "lucide-react";
import {
  CAROUSEL_SLIDE_HEIGHT,
  CAROUSEL_SLIDE_WIDTH,
} from "src/core/modules/agents/components/carousel/carousel-slide-renderer";

const parseTranslate = (el: HTMLElement): [number, number] => {
  const match = el.style.transform.match(/translate\(([^,)]+),\s*([^)]+)\)/);
  if (!match) return [0, 0];
  return [parseFloat(match[1] ?? "0"), parseFloat(match[2] ?? "0")];
};

const applyTranslate = (el: HTMLElement, x: number, y: number) => {
  const existing = el.style.transform || "";
  const without = existing.replace(/translate\([^)]*\)/, "").trim();
  el.style.transform = `translate(${x}px,${y}px)${without ? " " + without : ""}`;
};

type Props = {
  getSelectedElement: () => HTMLElement | null;
  onAligned: () => void;
};

type AlignAction =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

const ACTIONS: { key: AlignAction; icon: typeof AlignStartHorizontal; label: string }[] = [
  { key: "left", icon: AlignStartHorizontal, label: "Alinhar à esquerda" },
  { key: "center-h", icon: AlignCenterHorizontal, label: "Centralizar horizontal" },
  { key: "right", icon: AlignEndHorizontal, label: "Alinhar à direita" },
  { key: "top", icon: AlignStartVertical, label: "Alinhar ao topo" },
  { key: "center-v", icon: AlignCenterVertical, label: "Centralizar vertical" },
  { key: "bottom", icon: AlignEndVertical, label: "Alinhar à base" },
];

const alignElement = (el: HTMLElement, action: AlignAction) => {
  const rect = el.getBoundingClientRect();
  const [tx, ty] = parseTranslate(el);
  const w = rect.width;
  const h = rect.height;

  let newX = tx;
  let newY = ty;

  switch (action) {
    case "left":
      newX = tx - rect.left + 0; // left edge of slide (rect.left in iframe coords = element's left)
      break;
    case "center-h":
      newX = tx + (CAROUSEL_SLIDE_WIDTH / 2 - (rect.left + w / 2));
      break;
    case "right":
      newX = tx + (CAROUSEL_SLIDE_WIDTH - rect.right);
      break;
    case "top":
      newY = ty - rect.top;
      break;
    case "center-v":
      newY = ty + (CAROUSEL_SLIDE_HEIGHT / 2 - (rect.top + h / 2));
      break;
    case "bottom":
      newY = ty + (CAROUSEL_SLIDE_HEIGHT - rect.bottom);
      break;
  }

  applyTranslate(el, newX, newY);
};

export const CarouselAlignToolbar = ({ getSelectedElement, onAligned }: Props) => {
  const handleAlign = (action: AlignAction) => {
    const el = getSelectedElement();
    if (!el) return;
    alignElement(el, action);
    onAligned();
  };

  return (
    <div className="flex items-center gap-0.5 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-0.5">
      {ACTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          title={label}
          onClick={() => handleAlign(key)}
          className="flex size-7 items-center justify-center rounded text-[var(--fg-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
};
