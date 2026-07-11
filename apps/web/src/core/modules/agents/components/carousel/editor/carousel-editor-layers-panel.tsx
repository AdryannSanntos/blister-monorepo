"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Type, Layers, Upload, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import type { LayerInfo } from "src/core/modules/agents/components/carousel/editor/carousel-editor-canvas";
import { CarouselFontPicker, injectFontIntoDoc } from "src/core/modules/agents/components/carousel/editor/carousel-editor-font-picker";
import {
  applyFontFamilyToElement,
  extractFontFamilyName,
} from "src/core/modules/agents/components/carousel/editor/carousel-editor-fonts";
import { CarouselShadowEditor } from "src/core/modules/agents/components/carousel/editor/carousel-editor-shadow-editor";
import { CarouselOverlayPanel } from "src/core/modules/agents/components/carousel/editor/carousel-editor-overlay-panel";
import { useCarouselImageUpload } from "src/core/modules/agents/hooks/use-carousel-image-upload";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";
import { Slider } from "src/core/shared/components/ui/slider";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";

// react-moveable owns `transform: translate(...)` on the target element.
// The zoom slider stores its scale in `--carousel-zoom` and composes with translate.
const getZoomScale = (target: HTMLElement | null) => {
  const raw = target?.style.getPropertyValue("--carousel-zoom");
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 1;
};

const applyZoomTransform = (target: HTMLElement, scale: number) => {
  const existing = target.style.transform || "";
  const translateMatch = existing.match(/translate\([^)]*\)/);
  const translate = translateMatch ? translateMatch[0] : "";
  target.style.setProperty("--carousel-zoom", String(scale));
  target.style.transform = translate ? `${translate} scale(${scale})` : `scale(${scale})`;
};

const rgbToHex = (rgb: string): string => {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return "#000000";
  return (
    "#" +
    [m[0], m[1], m[2]]
      .map((n) => parseInt(n ?? "0").toString(16).padStart(2, "0"))
      .join("")
  );
};

const LAYER_TYPE_ICON: Record<LayerInfo["type"], typeof Type> = {
  text: Type,
  image: Image,
  other: Layers,
};

const FONT_WEIGHTS = [
  { value: "100", label: "100 Thin" },
  { value: "200", label: "200 ExtraLight" },
  { value: "300", label: "300 Light" },
  { value: "400", label: "400 Regular" },
  { value: "500", label: "500 Medium" },
  { value: "600", label: "600 SemiBold" },
  { value: "700", label: "700 Bold" },
  { value: "800", label: "800 ExtraBold" },
  { value: "900", label: "900 Black" },
];

const labelClass = "text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]";
const inputClass = "w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]";

type PanelSection = "elements" | "overlay";

export const CarouselEditorLayersPanel = ({
  slideId,
  layersVersion,
  getSelectedElement,
  getAllLayers,
  getContentDocument,
}: {
  slideId: string;
  layersVersion: number;
  getSelectedElement: () => HTMLElement | null;
  getAllLayers: () => LayerInfo[];
  getContentDocument: () => Document | null;
}) => {
  const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
  const setSelectedLayerId = useCarouselEditorStore((s) => s.setSelectedLayerId);
  const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);
  const slides = useCarouselEditorStore((s) => s.slides);
  const uploadImage = useCarouselImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  const pendingTargetElRef = useRef<HTMLElement | null>(null);
  const pendingSlideIdRef = useRef<string | null>(null);
  const appliedUrlRef = useRef<string | null>(null);
  const [section, setSection] = useState<PanelSection>("elements");

  const preview = useFilePreviewUrl(pendingFileId, Boolean(pendingFileId));
  const slide = slides.find((s) => s.id === slideId);

  const layers = useMemo(
    () => getAllLayers(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getAllLayers, slideId, layersVersion],
  );

  useEffect(() => {
    if (preview.isError) {
      pendingTargetElRef.current = null;
      pendingSlideIdRef.current = null;
      setPendingFileId(null);
      toast.error("Não foi possível carregar a imagem enviada. Tente novamente.");
      return;
    }
    const url = preview.data?.url;
    if (!url || appliedUrlRef.current === url) return;
    const target = pendingTargetElRef.current;
    const targetSlideId = pendingSlideIdRef.current;
    if (target && targetSlideId) {
      (target as HTMLImageElement).src = url;
      const doc = target.ownerDocument;
      const currentSlide = useCarouselEditorStore
        .getState()
        .slides.find((s) => s.id === targetSlideId);
      if (doc && currentSlide) {
        updateSlideContent(targetSlideId, doc.body.innerHTML, currentSlide.cssContent);
        if (targetSlideId !== slideId) toast.info("Imagem aplicada ao slide anterior.");
      }
    }
    appliedUrlRef.current = url;
    pendingTargetElRef.current = null;
    pendingSlideIdRef.current = null;
    setPendingFileId(null);
  }, [preview.data?.url, preview.isError, slideId, updateSlideContent]);

  // Layer list — shown when nothing is selected and on elements tab
  if (!selectedLayerId || !slide) {
    return (
      <div className="flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--line-subtle)]">
          <button
            type="button"
            onClick={() => setSection("elements")}
            className={cn(
              "flex-1 py-2 text-[12px]",
              section === "elements" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--fg-secondary)]",
            )}
          >
            Elementos
          </button>
          <button
            type="button"
            onClick={() => setSection("overlay")}
            className={cn(
              "flex-1 py-2 text-[12px]",
              section === "overlay" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--fg-secondary)]",
            )}
          >
            Overlay
          </button>
        </div>

        {section === "overlay" ? (
          <CarouselOverlayPanel
            getContentDocument={getContentDocument}
            onCommit={() => {
              const doc = getContentDocument();
              if (!doc || !slide) return;
              updateSlideContent(slideId, doc.body.innerHTML, slide.cssContent);
            }}
          />
        ) : (
          <>
            {layers.length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--fg-quaternary)]">
                Clique em um elemento do slide para editar.
              </p>
            ) : (
              <LayerList
                layers={layers}
                getSelectedElement={getSelectedElement}
                getAllLayers={getAllLayers}
                onSelect={setSelectedLayerId}
                onCommit={() => {
                  const el = getSelectedElement();
                  const doc = el?.ownerDocument;
                  if (!doc || !slide) return;
                  updateSlideContent(slideId, doc.body.innerHTML, slide.cssContent);
                }}
              />
            )}
          </>
        )}
      </div>
    );
  }

  const commit = () => {
    const el = getSelectedElement();
    const doc = el?.ownerDocument;
    if (!doc) return;
    updateSlideContent(slideId, doc.body.innerHTML, slide.cssContent);
  };

  const el = getSelectedElement();
  const isImage = el?.tagName === "IMG";
  const isBgDiv = !isImage && el && (el.style.backgroundImage || "").includes("url(");
  const isUploading = uploadImage.isPending || preview.isLoading;

  if (isImage) {
    return (
      <ImageControls
        el={el as HTMLImageElement}
        slideId={slideId}
        selectedLayerId={selectedLayerId}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        uploadImage={uploadImage}
        commit={commit}
        onBack={() => setSelectedLayerId(null)}
        setPendingFileId={setPendingFileId}
        pendingTargetElRef={pendingTargetElRef}
        pendingSlideIdRef={pendingSlideIdRef}
        appliedUrlRef={appliedUrlRef}
      />
    );
  }

  if (isBgDiv) {
    return (
      <BgImageControls
        el={el}
        slideId={slideId}
        selectedLayerId={selectedLayerId}
        commit={commit}
        onBack={() => setSelectedLayerId(null)}
      />
    );
  }

  // Text element controls
  return (
    <TextControls
      el={el ?? null}
      slideId={slideId}
      selectedLayerId={selectedLayerId}
      commit={commit}
      getContentDocument={getContentDocument}
      onBack={() => setSelectedLayerId(null)}
    />
  );
};

// ─── Layer List with visibility / lock / z-order ─────────────────────────────

const LayerList = ({
  layers,
  getSelectedElement,
  getAllLayers,
  onSelect,
  onCommit,
}: {
  layers: LayerInfo[];
  getSelectedElement: () => HTMLElement | null;
  getAllLayers: () => LayerInfo[];
  onSelect: (id: string) => void;
  onCommit: () => void;
}) => {
  const getEl = (id: string) => {
    const el = getSelectedElement();
    if (el?.getAttribute("data-carousel-layer-id") === id) return el;
    return el?.ownerDocument?.querySelector<HTMLElement>(`[data-carousel-layer-id="${id}"]`) ?? null;
  };

  const toggleVisibility = (id: string) => {
    const el = getEl(id);
    if (!el) return;
    el.style.display = el.style.display === "none" ? "" : "none";
    onCommit();
  };

  const toggleLock = (id: string) => {
    const el = getEl(id);
    if (!el) return;
    const locked = el.dataset.carouselLocked === "true";
    el.dataset.carouselLocked = locked ? "" : "true";
    onCommit();
  };

  const moveUp = (id: string) => {
    const el = getEl(id);
    if (!el?.parentElement) return;
    const next = el.nextElementSibling;
    if (next) el.parentElement.insertBefore(next, el);
    onCommit();
  };

  const moveDown = (id: string) => {
    const el = getEl(id);
    if (!el?.parentElement) return;
    const prev = el.previousElementSibling;
    if (prev) el.parentElement.insertBefore(el, prev);
    onCommit();
  };

  return (
    <div className="flex flex-col py-1">
      {layers.map((layer) => {
        const Icon = LAYER_TYPE_ICON[layer.type];
        const el = getEl(layer.id);
        const isHidden = el?.style.display === "none";
        const isLocked = el?.dataset.carouselLocked === "true";

        return (
          <div
            key={layer.id}
            className="group flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--bg-hover)]"
          >
            <button
              type="button"
              onClick={() => onSelect(layer.id)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <Icon className="size-3.5 shrink-0 text-[var(--fg-tertiary)]" />
              <span className={cn("flex-1 truncate text-[13px]", isHidden && "opacity-40 line-through")}>
                {layer.label}
              </span>
            </button>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => moveUp(layer.id)} className="flex size-5 items-center justify-center text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]" title="Para trás">
                <ChevronDown className="size-3" />
              </button>
              <button type="button" onClick={() => moveDown(layer.id)} className="flex size-5 items-center justify-center text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]" title="Para frente">
                <ChevronUp className="size-3" />
              </button>
              <button type="button" onClick={() => toggleVisibility(layer.id)} className={cn("flex size-5 items-center justify-center", isHidden ? "text-[var(--fg-quaternary)]" : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]")}>
                {isHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </button>
              <button type="button" onClick={() => toggleLock(layer.id)} className={cn("flex size-5 items-center justify-center", isLocked ? "text-[var(--accent)]" : "text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]")}>
                {isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Text controls ────────────────────────────────────────────────────────────

const TextControls = ({
  el,
  slideId: _slideId,
  selectedLayerId,
  commit,
  getContentDocument,
  onBack,
}: {
  el: HTMLElement | null;
  slideId: string;
  selectedLayerId: string;
  commit: () => void;
  getContentDocument: () => Document | null;
  onBack: () => void;
}) => {
  const computedStyle = el ? el.ownerDocument?.defaultView?.getComputedStyle(el) : null;
  const currentFontSize = computedStyle ? Math.round(parseFloat(computedStyle.fontSize)) : 16;
  const currentColor = el?.style.color || (computedStyle?.color ?? "#000000");
  const hexColor = rgbToHex(currentColor);
  const isBold = parseInt(computedStyle?.fontWeight ?? "400") >= 600;
  const isItalic = (el?.style.fontStyle || computedStyle?.fontStyle) === "italic";
  const isUnderline = (el?.style.textDecoration || computedStyle?.textDecoration || "").includes("underline");
  const isStrike = (el?.style.textDecoration || computedStyle?.textDecoration || "").includes("line-through");
  const currentWeight = el?.style.fontWeight || computedStyle?.fontWeight || "400";
  const currentFont = extractFontFamilyName(
    el?.style.fontFamily || computedStyle?.fontFamily,
  );
  const currentAlign = el?.style.textAlign || computedStyle?.textAlign || "left";
  const currentLineHeight = (() => {
    const lh = el?.style.lineHeight || computedStyle?.lineHeight;
    if (!lh || lh === "normal") return 1.4;
    const parsed = parseFloat(lh);
    return isNaN(parsed) ? 1.4 : parsed;
  })();
  const currentLetterSpacing = (() => {
    const ls = el?.style.letterSpacing || computedStyle?.letterSpacing;
    if (!ls || ls === "normal") return 0;
    return Math.round(parseFloat(ls));
  })();
  const currentTransform = el?.style.textTransform || computedStyle?.textTransform || "none";
  const currentOpacity = el ? parseFloat(el.style.opacity || "1") : 1;

  const bgHex = el?.style.backgroundColor
    ? rgbToHex(el.style.backgroundColor)
    : "#ffffff";
  const hasBg = !!(el?.style.backgroundColor && el.style.backgroundColor !== "transparent" && el.style.backgroundColor !== "rgba(0, 0, 0, 0)");

  const boxShadow = el?.style.boxShadow || "none";
  const textShadow = el?.style.textShadow || "none";

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[11px] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]">
        ← Voltar
      </button>

      {/* Text content */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Texto</label>
        <Textarea
          key={selectedLayerId}
          defaultValue={el?.textContent ?? ""}
          onBlur={(event) => {
            if (el) el.textContent = event.target.value;
            commit();
          }}
        />
      </div>

      {/* Font family */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Fonte</label>
        <CarouselFontPicker
          value={currentFont}
          onChange={(font) => {
            if (!el) return;
            applyFontFamilyToElement(el, font);
            const doc = getContentDocument();
            if (doc) injectFontIntoDoc(doc, font);
            commit();
          }}
        />
      </div>

      {/* Font weight */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Peso</label>
        <select
          defaultValue={currentWeight}
          onChange={(e) => { if (el) { el.style.fontWeight = e.target.value; commit(); } }}
          className={inputClass}
        >
          {FONT_WEIGHTS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* Style toggles: B I U S */}
      <div className="flex items-center gap-1.5">
        {[
          { label: "B", style: "font-bold", active: isBold, action: () => { if (el) { el.style.fontWeight = isBold ? "400" : "700"; commit(); } } },
          { label: "I", style: "italic", active: isItalic, action: () => { if (el) { el.style.fontStyle = isItalic ? "normal" : "italic"; commit(); } } },
          { label: "U", style: "underline", active: isUnderline, action: () => { if (el) { el.style.textDecoration = isUnderline ? "none" : "underline"; commit(); } } },
          { label: "S", style: "line-through", active: isStrike, action: () => { if (el) { el.style.textDecoration = isStrike ? "none" : "line-through"; commit(); } } },
        ].map(({ label, style, active, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className={cn(
              `flex size-8 items-center justify-center rounded border text-[13px] ${style}`,
              active ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Text alignment */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Alinhamento</label>
        <div className="flex gap-1">
          {(["left", "center", "right", "justify"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => { if (el) { el.style.textAlign = align; commit(); } }}
              className={cn(
                "flex flex-1 items-center justify-center rounded border py-1 text-[12px]",
                currentAlign === align ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-quaternary)] hover:bg-[var(--bg-hover)]",
              )}
            >
              {align === "left" ? "←" : align === "center" ? "↔" : align === "right" ? "→" : "≡"}
            </button>
          ))}
        </div>
      </div>

      {/* Size + Color */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tamanho</label>
          <input
            key={`${selectedLayerId}-size`}
            type="number"
            defaultValue={currentFontSize}
            min={6}
            max={400}
            onBlur={(event) => {
              if (!el) return;
              const v = parseInt(event.target.value);
              if (!Number.isNaN(v) && v > 0) el.style.fontSize = `${v}px`;
              commit();
            }}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Cor</label>
          <div className="flex items-center gap-1.5">
            <input
              key={`${selectedLayerId}-color`}
              type="color"
              defaultValue={hexColor}
              onChange={(event) => { if (el) el.style.color = event.target.value; }}
              onBlur={commit}
              className="size-8 cursor-pointer rounded border border-[var(--line-default)] bg-transparent p-0.5"
            />
            <span className="font-mono text-[11px] uppercase text-[var(--fg-tertiary)]">{hexColor}</span>
          </div>
        </div>
      </div>

      {/* Line height + Letter spacing */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Entrelinha</label>
        <Slider
          key={`${selectedLayerId}-lh`}
          min={0.8}
          max={3}
          step={0.05}
          defaultValue={[currentLineHeight]}
          onValueChange={([v]) => { if (el && v !== undefined) el.style.lineHeight = String(v); }}
          onValueCommit={commit}
        />
        <div className="text-right font-mono text-[10px] text-[var(--fg-quaternary)]">{currentLineHeight.toFixed(2)}</div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Espaçamento entre letras</label>
        <Slider
          key={`${selectedLayerId}-ls`}
          min={-5}
          max={20}
          step={0.5}
          defaultValue={[currentLetterSpacing]}
          onValueChange={([v]) => { if (el && v !== undefined) el.style.letterSpacing = `${v}px`; }}
          onValueCommit={commit}
        />
        <div className="text-right font-mono text-[10px] text-[var(--fg-quaternary)]">{currentLetterSpacing}px</div>
      </div>

      {/* Text transform */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Transformar</label>
        <div className="flex gap-1">
          {(["none", "uppercase", "lowercase", "capitalize"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { if (el) { el.style.textTransform = t; commit(); } }}
              className={cn(
                "flex-1 rounded border py-1 text-[10px]",
                currentTransform === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-quaternary)] hover:bg-[var(--bg-hover)]",
              )}
            >
              {t === "none" ? "Aa" : t === "uppercase" ? "AA" : t === "lowercase" ? "aa" : "Aa!"}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Opacidade</label>
        <Slider
          key={`${selectedLayerId}-op`}
          min={0}
          max={1}
          step={0.02}
          defaultValue={[currentOpacity]}
          onValueChange={([v]) => { if (el && v !== undefined) el.style.opacity = String(v); }}
          onValueCommit={commit}
        />
      </div>

      {/* Background color */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Fundo</label>
          <button
            type="button"
            onClick={() => {
              if (!el) return;
              if (hasBg) {
                el.style.backgroundColor = "";
              } else {
                el.style.backgroundColor = "#ffffff";
              }
              commit();
            }}
            className={cn(
              "h-5 w-9 rounded-full transition-colors",
              hasBg ? "bg-[var(--accent)]" : "bg-[var(--line-default)]",
            )}
          >
            <span className={cn("block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform", hasBg && "translate-x-4")} />
          </button>
        </div>
        {hasBg && (
          <input
            type="color"
            defaultValue={bgHex}
            onChange={(e) => { if (el) { el.style.backgroundColor = e.target.value; } }}
            onBlur={commit}
            className="h-8 w-full cursor-pointer rounded border border-[var(--line-default)]"
          />
        )}
      </div>

      {/* Border radius */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Border Radius</label>
        <Slider
          key={`${selectedLayerId}-br`}
          min={0}
          max={50}
          step={1}
          defaultValue={[parseInt(el?.style.borderRadius || "0")]}
          onValueChange={([v]) => { if (el && v !== undefined) el.style.borderRadius = `${v}px`; }}
          onValueCommit={commit}
        />
      </div>

      {/* Box shadow */}
      <CarouselShadowEditor
        type="box"
        value={boxShadow}
        onChange={(v) => { if (el) { el.style.boxShadow = v; commit(); } }}
      />

      {/* Text shadow */}
      <CarouselShadowEditor
        type="text"
        value={textShadow}
        onChange={(v) => { if (el) { el.style.textShadow = v; commit(); } }}
      />
    </div>
  );
};

// ─── Image controls ───────────────────────────────────────────────────────────

const ImageControls = ({
  el,
  slideId,
  selectedLayerId,
  isUploading,
  fileInputRef,
  uploadImage,
  commit,
  onBack,
  setPendingFileId,
  pendingTargetElRef,
  pendingSlideIdRef,
  appliedUrlRef,
}: {
  el: HTMLImageElement;
  slideId: string;
  selectedLayerId: string;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadImage: ReturnType<typeof useCarouselImageUpload>;
  commit: () => void;
  onBack: () => void;
  setPendingFileId: (id: string | null) => void;
  pendingTargetElRef: React.MutableRefObject<HTMLElement | null>;
  pendingSlideIdRef: React.MutableRefObject<string | null>;
  appliedUrlRef: React.MutableRefObject<string | null>;
}) => {
  const currentZoom = getZoomScale(el);
  const currentOpacity = parseFloat(el.style.opacity || "1");
  const isContain = el.style.objectFit === "contain";

  // Parse object-position
  const objPos = el.style.objectPosition || "50% 50%";
  const [objX, objY] = objPos.split(" ").map((v) => parseFloat(v) || 50);

  // Parse filter
  const parseFilter = (prop: string, unit: string, def: number) => {
    const m = el.style.filter?.match(new RegExp(`${prop}\\(([^)]+)${unit}\\)`));
    return m ? parseFloat(m[1] ?? String(def)) : def;
  };
  const brightness = parseFilter("brightness", "%", 100);
  const contrast = parseFilter("contrast", "%", 100);
  const saturate = parseFilter("saturate", "%", 100);
  const blur = parseFilter("blur", "px", 0);
  const sepia = parseFilter("sepia", "%", 0);

  const applyFilter = (overrides: Partial<{ brightness: number; contrast: number; saturate: number; blur: number; sepia: number }>) => {
    const vals = { brightness, contrast, saturate, blur, sepia, ...overrides };
    el.style.filter = `brightness(${vals.brightness}%) contrast(${vals.contrast}%) saturate(${vals.saturate}%) blur(${vals.blur}px) sepia(${vals.sepia}%)`;
  };

  const boxShadow = el.style.boxShadow || "none";

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[11px] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]">
        ← Voltar
      </button>

      {/* Zoom */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Zoom</label>
        <Slider key={selectedLayerId} min={1} max={2} step={0.05} defaultValue={[currentZoom]}
          onValueChange={([v]) => { if (v !== undefined) applyZoomTransform(el, v); }}
          onValueCommit={commit}
        />
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Opacidade</label>
        <Slider key={`${selectedLayerId}-op`} min={0} max={1} step={0.05} defaultValue={[currentOpacity]}
          onValueChange={([v]) => { if (v !== undefined) el.style.opacity = String(v); }}
          onValueCommit={commit}
        />
      </div>

      {/* Object-fit */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Ajuste</label>
        <div className="flex gap-1">
          <button type="button" onClick={() => { el.style.objectFit = "cover"; commit(); }}
            className={cn("flex-1 rounded border px-2 py-1 text-[12px]",
              !isContain ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]")}>
            Cobrir
          </button>
          <button type="button" onClick={() => { el.style.objectFit = "contain"; commit(); }}
            className={cn("flex-1 rounded border px-2 py-1 text-[12px]",
              isContain ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]")}>
            Conter
          </button>
        </div>
      </div>

      {/* Object position */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Posição X</label>
        <Slider key={`${selectedLayerId}-ox`} min={0} max={100} step={1} defaultValue={[objX]}
          onValueChange={([v]) => { if (v !== undefined) el.style.objectPosition = `${v}% ${objY}%`; }}
          onValueCommit={commit}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Posição Y</label>
        <Slider key={`${selectedLayerId}-oy`} min={0} max={100} step={1} defaultValue={[objY]}
          onValueChange={([v]) => { if (v !== undefined) el.style.objectPosition = `${objX}% ${v}%`; }}
          onValueCommit={commit}
        />
      </div>

      {/* Image filters */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Filtros</label>
        {[
          { key: "brightness", label: "Brilho", min: 0, max: 200, def: 100, val: brightness },
          { key: "contrast", label: "Contraste", min: 0, max: 200, def: 100, val: contrast },
          { key: "saturate", label: "Saturação", min: 0, max: 200, def: 100, val: saturate },
          { key: "blur", label: "Desfoque", min: 0, max: 20, def: 0, val: blur },
          { key: "sepia", label: "Sépia", min: 0, max: 100, def: 0, val: sepia },
        ].map(({ key, label, min, max, def: _def, val }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-20 text-[10px] text-[var(--fg-quaternary)]">{label}</span>
            <Slider
              key={`${selectedLayerId}-${key}`}
              min={min}
              max={max}
              step={key === "blur" ? 0.5 : 1}
              defaultValue={[val]}
              onValueChange={([v]) => { if (v !== undefined) applyFilter({ [key]: v }); }}
              onValueCommit={commit}
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-[10px] text-[var(--fg-quaternary)]">{Math.round(val)}</span>
          </div>
        ))}
      </div>

      {/* Shadow */}
      <CarouselShadowEditor
        type="box"
        value={boxShadow}
        onChange={(v) => { el.style.boxShadow = v; commit(); }}
      />

      {/* Image upload */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Imagem</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] px-3 py-2 text-[13px] hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="size-4" /> {isUploading ? "Enviando…" : "Trocar imagem"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || !el) return;
            const targetEl = el;
            const slotKey = el.getAttribute("data-carousel-slot") ?? "image_url";
            try {
              const result = await uploadImage.mutateAsync({ file, slideId, slotKey });
              pendingTargetElRef.current = targetEl;
              pendingSlideIdRef.current = slideId;
              appliedUrlRef.current = null;
              setPendingFileId(result.fileId);
            } catch {
              toast.error("Não foi possível enviar a imagem. Tente novamente.");
            }
          }}
        />
      </div>
    </div>
  );
};

// ─── Background-image div controls ───────────────────────────────────────────

const BgImageControls = ({
  el,
  slideId: _slideId,
  selectedLayerId,
  commit,
  onBack,
}: {
  el: HTMLElement;
  slideId: string;
  selectedLayerId: string;
  commit: () => void;
  onBack: () => void;
}) => {
  const bgPos = el.style.backgroundPosition || "50% 50%";
  const [bgX, bgY] = bgPos.split(" ").map((v) => parseFloat(v) || 50);
  const bgSize = el.style.backgroundSize || "cover";
  const bgRepeat = el.style.backgroundRepeat || "no-repeat";

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[11px] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]">
        ← Voltar
      </button>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Posição X</label>
        <Slider key={`${selectedLayerId}-bgx`} min={0} max={100} step={1} defaultValue={[bgX]}
          onValueChange={([v]) => { if (v !== undefined) el.style.backgroundPosition = `${v}% ${bgY}%`; }}
          onValueCommit={commit}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Posição Y</label>
        <Slider key={`${selectedLayerId}-bgy`} min={0} max={100} step={1} defaultValue={[bgY]}
          onValueChange={([v]) => { if (v !== undefined) el.style.backgroundPosition = `${bgX}% ${v}%`; }}
          onValueCommit={commit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Tamanho</label>
        <div className="flex gap-1">
          {(["cover", "contain", "auto"] as const).map((s) => (
            <button key={s} type="button"
              onClick={() => { el.style.backgroundSize = s; commit(); }}
              className={cn("flex-1 rounded border py-1 text-[12px]",
                bgSize === s ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-quaternary)] hover:bg-[var(--bg-hover)]")}>
              {s === "cover" ? "Cobrir" : s === "contain" ? "Conter" : "Auto"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Repetir</label>
        <div className="flex gap-1">
          {(["no-repeat", "repeat", "repeat-x", "repeat-y"] as const).map((r) => (
            <button key={r} type="button"
              onClick={() => { el.style.backgroundRepeat = r; commit(); }}
              className={cn("flex-1 rounded border py-0.5 text-[10px]",
                bgRepeat === r ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--fg-quaternary)] hover:bg-[var(--bg-hover)]")}>
              {r === "no-repeat" ? "Não" : r === "repeat" ? "Sim" : r === "repeat-x" ? "X" : "Y"}
            </button>
          ))}
        </div>
      </div>

      <CarouselShadowEditor
        type="box"
        value={el.style.boxShadow || "none"}
        onChange={(v) => { el.style.boxShadow = v; commit(); }}
      />
    </div>
  );
};
