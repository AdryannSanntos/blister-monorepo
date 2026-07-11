"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "src/core/shared/utils";
import { Slider } from "src/core/shared/components/ui/slider";

const OVERLAY_ATTR = "data-carousel-global-overlay";

type OverlayType = "none" | "solid" | "gradient" | "vignette";
type VignettePreset = "top" | "bottom" | "sides" | "center" | "all";
type GradientDir = "to-bottom" | "to-top" | "to-right" | "to-left" | "radial";

const GRADIENT_LABELS: Record<GradientDir, string> = {
  "to-bottom": "↓ Baixo",
  "to-top": "↑ Cima",
  "to-right": "→ Direita",
  "to-left": "← Esquerda",
  radial: "○ Radial",
};

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken",
  "lighten", "color-dodge", "color-burn", "hard-light", "soft-light",
];

const getOrCreateOverlay = (doc: Document): HTMLElement => {
  // Always target .slide so the overlay is sized to the slide, not the body.
  const target = doc.querySelector<HTMLElement>(".slide") ?? doc.body;
  let el = doc.querySelector<HTMLElement>(`[${OVERLAY_ATTR}]`);
  if (!el) {
    el = doc.createElement("div");
    el.setAttribute(OVERLAY_ATTR, "true");
    target.appendChild(el);
  } else if (!target.contains(el)) {
    // Migrate: old serialized HTML may have placed the overlay on body with
    // position:fixed, causing it to cover the full 1350px body instead of
    // just the slide. Move it to the right parent.
    target.appendChild(el);
  }
  // Always reset positioning CSS so stale values from old serialized HTML are
  // corrected (background/mixBlendMode are set by apply() after this call).
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.pointerEvents = "none";
  el.style.zIndex = "9999";
  return el;
};

const removeOverlay = (doc: Document) => {
  doc.querySelector(`[${OVERLAY_ATTR}]`)?.remove();
};

const buildBackground = (
  type: OverlayType,
  color: string,
  opacity: number,
  gradDir: GradientDir,
  vigPreset: VignettePreset,
): string => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  const c = color + alpha;
  const transparent = color + "00";
  switch (type) {
    case "solid":
      return `rgba(${hexToRgb(color)},${opacity})`;
    case "gradient": {
      if (gradDir === "radial") {
        return `radial-gradient(ellipse at center, ${c} 0%, ${transparent} 100%)`;
      }
      const dir = gradDir.replace("-", " ");
      return `linear-gradient(${dir}, ${c} 0%, ${transparent} 100%)`;
    }
    case "vignette": {
      switch (vigPreset) {
        case "top":
          return `linear-gradient(to bottom, ${c} 0%, ${transparent} 60%)`;
        case "bottom":
          return `linear-gradient(to top, ${c} 0%, ${transparent} 60%)`;
        case "sides":
          return `linear-gradient(to right, ${c} 0%, ${transparent} 30%, ${transparent} 70%, ${c} 100%)`;
        case "center":
          return `radial-gradient(ellipse at center, ${c} 0%, ${transparent} 70%)`;
        case "all":
          return `radial-gradient(ellipse at center, ${transparent} 30%, ${c} 100%)`;
      }
      break;
    }
    default:
      return "none";
  }
};

const hexToRgb = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

type Props = {
  getContentDocument: () => Document | null;
  onCommit: () => void;
};

export const CarouselOverlayPanel = ({ getContentDocument, onCommit }: Props) => {
  const [type, setType] = useState<OverlayType>("none");
  const [color, setColor] = useState("#000000");
  const [opacity, setOpacity] = useState(0.4);
  const [gradDir, setGradDir] = useState<GradientDir>("to-bottom");
  const [vigPreset, setVigPreset] = useState<VignettePreset>("bottom");
  const [blendMode, setBlendMode] = useState("normal");

  // Debounce the commit so rapid slider movements don't trigger multiple iframe
  // reloads (each reload would wipe the DOM-injected overlay for a frame, causing
  // a visual flash).
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => { onCommit(); }, 600);
  }, [onCommit]);

  const apply = useCallback((
    nextType = type,
    nextColor = color,
    nextOpacity = opacity,
    nextDir = gradDir,
    nextVig = vigPreset,
    nextBlend = blendMode,
  ) => {
    const doc = getContentDocument();
    if (!doc) return;
    if (nextType === "none") {
      removeOverlay(doc);
      scheduleCommit();
      return;
    }
    const el = getOrCreateOverlay(doc);
    const bg = buildBackground(nextType, nextColor, nextOpacity, nextDir, nextVig);
    el.style.background = bg;
    el.style.mixBlendMode = nextBlend;
    scheduleCommit();
  }, [type, color, opacity, gradDir, vigPreset, blendMode, getContentDocument, scheduleCommit]);

  // Re-apply the overlay after the iframe reloads (srcDoc change wipes DOM and
  // brings the overlay back from the serialized HTML, but we want to ensure the
  // live state stays in sync).
  useEffect(() => {
    if (type === "none") return;
    // Small delay so the iframe has time to finish loading.
    const t = setTimeout(() => { apply(); }, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getContentDocument]);

  // Read existing overlay state on mount so the panel reflects what's already applied.
  useEffect(() => {
    const doc = getContentDocument();
    if (!doc) return;
    const el = doc.querySelector<HTMLElement>(`[${OVERLAY_ATTR}]`);
    if (!el) return;
    if (el.style.mixBlendMode) setBlendMode(el.style.mixBlendMode);
  }, [getContentDocument]);

  const SECTION = "text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]";
  const CHIP = (active: boolean) =>
    cn(
      "rounded border px-2 py-1 text-[11px]",
      active
        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
        : "border-[var(--line-default)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]",
    );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="text-[11px] font-semibold text-[var(--fg-secondary)]">
        Overlay do slide
      </div>

      {/* Type picker */}
      <div className="flex flex-col gap-2">
        <div className={SECTION}>Tipo</div>
        <div className="flex flex-wrap gap-1">
          {(["none", "solid", "gradient", "vignette"] as OverlayType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={CHIP(type === t)}
              onClick={() => {
                setType(t);
                apply(t);
              }}
            >
              {t === "none" ? "Nenhum" : t === "solid" ? "Sólido" : t === "gradient" ? "Gradiente" : "Vinheta"}
            </button>
          ))}
        </div>
      </div>

      {type !== "none" && (
        <>
          {/* Color */}
          <div className="flex flex-col gap-2">
            <div className={SECTION}>Cor</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  apply(type, e.target.value);
                }}
                className="size-8 cursor-pointer rounded border border-[var(--line-default)] bg-transparent p-0.5"
              />
              <span className="font-mono text-[12px] uppercase text-[var(--fg-tertiary)]">{color}</span>
            </div>
          </div>

          {/* Opacity */}
          <div className="flex flex-col gap-2">
            <div className={SECTION}>Opacidade — {Math.round(opacity * 100)}%</div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[opacity]}
              onValueChange={([v]) => {
                if (v === undefined) return;
                setOpacity(v);
                apply(type, color, v);
              }}
            />
          </div>

          {/* Gradient direction */}
          {type === "gradient" && (
            <div className="flex flex-col gap-2">
              <div className={SECTION}>Direção</div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(GRADIENT_LABELS) as GradientDir[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={CHIP(gradDir === d)}
                    onClick={() => {
                      setGradDir(d);
                      apply(type, color, opacity, d);
                    }}
                  >
                    {GRADIENT_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vignette preset */}
          {type === "vignette" && (
            <div className="flex flex-col gap-2">
              <div className={SECTION}>Posição</div>
              <div className="flex flex-wrap gap-1">
                {(["top", "bottom", "sides", "center", "all"] as VignettePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={CHIP(vigPreset === p)}
                    onClick={() => {
                      setVigPreset(p);
                      apply(type, color, opacity, gradDir, p);
                    }}
                  >
                    {p === "top" ? "Topo" : p === "bottom" ? "Base" : p === "sides" ? "Lados" : p === "center" ? "Centro" : "Geral"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blend mode */}
          <div className="flex flex-col gap-2">
            <div className={SECTION}>Mesclagem</div>
            <select
              value={blendMode}
              onChange={(e) => {
                setBlendMode(e.target.value);
                apply(type, color, opacity, gradDir, vigPreset, e.target.value);
              }}
              className="w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};
