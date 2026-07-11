"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Slider } from "src/core/shared/components/ui/slider";
import { cn } from "src/core/shared/utils";

export type ShadowEditorType = "box" | "text";

interface ShadowLayer {
  enabled: boolean;
  h: number;
  v: number;
  blur: number;
  spread: number; // only used for box-shadow
  color: string;
  alpha: number;
  inset: boolean; // only used for box-shadow
}

const DEFAULT_LAYER: ShadowLayer = {
  enabled: true,
  h: 4,
  v: 4,
  blur: 8,
  spread: 0,
  color: "#000000",
  alpha: 0.4,
  inset: false,
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function serializeShadows(layers: ShadowLayer[], type: ShadowEditorType): string {
  return layers
    .filter((l) => l.enabled)
    .map((l) => {
      const color = hexToRgba(l.color, l.alpha);
      if (type === "box") {
        const inset = l.inset ? "inset " : "";
        return `${inset}${l.h}px ${l.v}px ${l.blur}px ${l.spread}px ${color}`;
      }
      return `${l.h}px ${l.v}px ${l.blur}px ${color}`;
    })
    .join(", ") || "none";
}

function parseBoxShadow(css: string): ShadowLayer[] {
  if (!css || css === "none") return [];
  // Very basic parsing — split by top-level commas
  const parts = css.split(/,(?![^(]*\))/).map((p) => p.trim());
  return parts.map((part): ShadowLayer => {
    const inset = part.startsWith("inset");
    const cleaned = part.replace("inset", "").trim();
    const rgba = cleaned.match(/rgba?\([^)]+\)/)?.[0] ?? "#000000";
    const nums = cleaned.replace(/rgba?\([^)]+\)/, "").trim().split(/\s+/).map(parseFloat);
    const alphaMatch = rgba.match(/[\d.]+/g);
    const alphaVal = alphaMatch && alphaMatch.length >= 4 ? parseFloat(alphaMatch[3] ?? "0.4") : 0.4;
    return {
      enabled: true,
      h: nums[0] ?? 4,
      v: nums[1] ?? 4,
      blur: nums[2] ?? 8,
      spread: nums[3] ?? 0,
      color: "#000000",
      alpha: alphaVal,
      inset,
    };
  });
}

interface Props {
  type: ShadowEditorType;
  value: string;
  onChange: (css: string) => void;
}

export const CarouselShadowEditor = ({ type, value, onChange }: Props) => {
  const [layers, setLayers] = useState<ShadowLayer[]>(() => parseBoxShadow(value));
  const [enabled, setEnabled] = useState(value !== "" && value !== "none");

  const emit = (newLayers: ShadowLayer[], isEnabled: boolean) => {
    if (!isEnabled) {
      onChange("none");
      return;
    }
    onChange(serializeShadows(newLayers, type));
  };

  const update = (index: number, patch: Partial<ShadowLayer>) => {
    const next = layers.map((l, i) => (i === index ? { ...l, ...patch } : l));
    setLayers(next);
    emit(next, enabled);
  };

  const addLayer = () => {
    const next = [...layers, { ...DEFAULT_LAYER }];
    setLayers(next);
    if (!enabled) {
      setEnabled(true);
      emit(next, true);
    } else {
      emit(next, enabled);
    }
  };

  const removeLayer = (index: number) => {
    const next = layers.filter((_, i) => i !== index);
    setLayers(next);
    emit(next, enabled);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    emit(layers, next);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Enable / disable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
          {type === "box" ? "Sombra da caixa" : "Sombra do texto"}
        </span>
        <button
          type="button"
          onClick={toggleEnabled}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            enabled ? "bg-[var(--accent)]" : "bg-[var(--line-default)]",
          )}
          aria-label={enabled ? "Desativar sombra" : "Ativar sombra"}
        >
          <span
            className={cn(
              "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-4">
          {layers.map((layer, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-[var(--r-md)] border border-[var(--line-subtle)] p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--fg-secondary)]">
                  Sombra {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeLayer(i)}
                  className="text-[var(--fg-quaternary)] hover:text-red-400"
                  aria-label="Remover sombra"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* H / V */}
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="H"
                  value={layer.h}
                  onChange={(v) => update(i, { h: v })}
                />
                <NumInput
                  label="V"
                  value={layer.v}
                  onChange={(v) => update(i, { v: v })}
                />
              </div>

              {/* Blur / Spread (spread only for box) */}
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="Blur"
                  value={layer.blur}
                  min={0}
                  onChange={(v) => update(i, { blur: v })}
                />
                {type === "box" && (
                  <NumInput
                    label="Spread"
                    value={layer.spread}
                    onChange={(v) => update(i, { spread: v })}
                  />
                )}
              </div>

              {/* Color + Alpha */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className="size-7 cursor-pointer rounded border border-[var(--line-default)] bg-transparent p-0.5"
                />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-[10px] text-[var(--fg-quaternary)]">
                    Alpha {Math.round(layer.alpha * 100)}%
                  </span>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[layer.alpha]}
                    onValueChange={([v]) => v !== undefined && update(i, { alpha: v })}
                  />
                </div>
              </div>

              {/* Inset (box-shadow only) */}
              {type === "box" && (
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--fg-secondary)]">
                  <input
                    type="checkbox"
                    checked={layer.inset}
                    onChange={(e) => update(i, { inset: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  Interna (inset)
                </label>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addLayer}
            className="flex items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] py-1.5 text-[12px] text-[var(--fg-tertiary)] hover:border-[var(--line-strong)] hover:text-[var(--fg-primary)]"
          >
            <Plus className="size-3.5" /> Adicionar sombra
          </button>
        </div>
      )}
    </div>
  );
};

const NumInput = ({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-[var(--fg-quaternary)]">{label}</span>
    <input
      type="number"
      value={Number.isNaN(value) ? "" : value}
      min={min}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
      className="w-full rounded border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
    />
  </div>
);
