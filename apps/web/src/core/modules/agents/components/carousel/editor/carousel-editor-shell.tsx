"use client";

import type { CarouselOutput } from "@company-os/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Copy, Minus, Plus, Trash2, X, Download } from "lucide-react";

import { CarouselEditorAdjustBar } from "src/core/modules/agents/components/carousel/editor/carousel-editor-adjust-bar";
import {
  CarouselEditorCanvas,
  type CarouselEditorCanvasHandle,
} from "src/core/modules/agents/components/carousel/editor/carousel-editor-canvas";
import { CarouselEditorLayersPanel } from "src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel";
import { CarouselAlignToolbar } from "src/core/modules/agents/components/carousel/editor/carousel-editor-toolbar";
import { CarouselSlideRenderer } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { useEditAgentRunOutput } from "src/core/modules/agents/hooks/use-agent-run-mutations";
import { useCarouselRender } from "src/core/modules/agents/hooks/use-carousel-render";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
import { getCarouselSlideReactKey } from "src/core/modules/agents/utils/carousel-run-display";
import { CAROUSEL_SLIDE_HEIGHT, CAROUSEL_SLIDE_WIDTH } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { Heading } from "src/core/shared/components/ui/heading";
import { cn } from "src/core/shared/utils";

// Thumbnail width. The strip column (108px, set on the grid below) must stay wider than
// THUMB_WIDTH + its own p-3 padding (76 + 24 = 100px) or thumbnails overflow past the
// column edge and visually touch/cross the canvas border.
const THUMB_WIDTH = 76;

type Props = {
  runId: string;
  output: CarouselOutput;
  onClose: () => void;
};

export const CarouselEditorShell = ({ runId, output, onClose }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);
  const [autoScale, setAutoScale] = useState(0.45);
  // Incremented each time the active slide's iframe loads — causes layers panel to re-query layers.
  const [layersVersion, setLayersVersion] = useState(0);
  // Tracks which slide is being dragged for HTML5 reorder.
  const dragIndexRef = useRef<number | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<CarouselEditorCanvasHandle>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useCarouselEditorStore((s) => s.slides);
  const setSlides = useCarouselEditorStore((s) => s.setSlides);
  const dirty = useCarouselEditorStore((s) => s.dirty);
  const markSaved = useCarouselEditorStore((s) => s.markSaved);
  const activeSlideId = useCarouselEditorStore((s) => s.activeSlideId);
  const setActiveSlideId = useCarouselEditorStore((s) => s.setActiveSlideId);
  const reset = useCarouselEditorStore((s) => s.reset);
  const panelTab = useCarouselEditorStore((s) => s.panelTab);
  const setPanelTab = useCarouselEditorStore((s) => s.setPanelTab);
  const duplicateSlide = useCarouselEditorStore((s) => s.duplicateSlide);
  const deleteSlide = useCarouselEditorStore((s) => s.deleteSlide);
  const reorderSlides = useCarouselEditorStore((s) => s.reorderSlides);
  const undo = useCarouselEditorStore((s) => s.undo);
  const redo = useCarouselEditorStore((s) => s.redo);
  const setClipboardHtml = useCarouselEditorStore((s) => s.setClipboardHtml);
  const clipboardHtml = useCarouselEditorStore((s) => s.clipboardHtml);
  const setSelectedLayerId = useCarouselEditorStore((s) => s.setSelectedLayerId);

  const editOutput = useEditAgentRunOutput(runId, "carousel");
  const renderSlides = useCarouselRender(runId);
  const { actions: runActions } = useCarouselRunDetail(runId);

  const lastSyncedRunIdRef = useRef<string | null>(null);

  const scale = autoScale * zoomMultiplier;

  // Measure canvas container and compute the largest scale that fits.
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      const padding = 48;
      const s = Math.min(
        (width - padding) / CAROUSEL_SLIDE_WIDTH,
        (height - padding) / CAROUSEL_SLIDE_HEIGHT,
        1.0,
      );
      setAutoScale(Math.max(s, 0.2));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (lastSyncedRunIdRef.current !== runId) {
      lastSyncedRunIdRef.current = runId;
      reset();
      setSlides(output.slides);
      return;
    }
    if (useCarouselEditorStore.getState().dirty) return;
    setSlides(output.slides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, output.slides, setSlides, reset]);

  const activeSlide =
    slides.find((slide) => slide.id === activeSlideId) ?? slides[activeIndex] ?? null;

  const getSelectedElement = useCallback((): HTMLElement | null => {
    const doc = canvasRef.current?.getContentDocument();
    const layerId = useCarouselEditorStore.getState().selectedLayerId;
    if (!doc || !layerId) return null;
    return doc.querySelector<HTMLElement>(`[data-carousel-layer-id="${layerId}"]`);
  }, []);

  const getAllLayers = useCallback(() => canvasRef.current?.getAllLayers() ?? [], []);
  const getContentDocument = useCallback(() => canvasRef.current?.getContentDocument() ?? null, []);

  const persistOutput = useCallback(async () => {
    const currentSlides = useCarouselEditorStore.getState().slides;
    if (!currentSlides.length) return;
    await editOutput.mutateAsync({ editedOutput: { slides: currentSlides } });
    markSaved();
  }, [editOutput, markSaved]);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistOutput();
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirty, slides, persistOutput]);

  const handleSelectSlide = useCallback(
    (index: number, slideId: string) => {
      setActiveIndex(index);
      setActiveSlideId(slideId);
    },
    [setActiveSlideId],
  );

  // Clones the currently-selected canvas element in place, offsets it, and commits
  // the slide. Shared by Ctrl+D (duplicate) and Ctrl+V (paste from clipboardHtml).
  const insertClonedElement = useCallback(
    (outerHtml: string) => {
      const doc = canvasRef.current?.getContentDocument();
      if (!doc) return;
      const wrapper = doc.createElement("div");
      wrapper.innerHTML = outerHtml;
      const clone = wrapper.firstElementChild as HTMLElement | null;
      if (!clone) return;
      clone.removeAttribute("data-carousel-layer-id");
      const match = (clone.style.transform || "").match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      const [x, y] = match
        ? [parseFloat(match[1] ?? "0") + 16, parseFloat(match[2] ?? "0") + 16]
        : [16, 16];
      clone.style.transform = `translate(${x}px, ${y}px)`;
      doc.body.appendChild(clone);
      const activeSlide = slides.find((s) => s.id === activeSlideId);
      if (activeSlide) {
        useCarouselEditorStore.getState().updateSlideContent(activeSlide.id, doc.body.innerHTML, activeSlide.cssContent);
      }
    },
    [slides, activeSlideId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;

      // While typing in a text field, slider, etc., every shortcut below must fall
      // through to native browser/input behavior instead of acting on the canvas.
      const target = event.target;
      const isTypingInField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("role") === "slider" ||
          target.closest('[role="slider"]'));
      if (isTypingInField) return;

      // Ctrl+Z → undo, Ctrl+Y / Ctrl+Shift+Z → redo
      if (isCtrl && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (isCtrl && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl+C → copy selected element, Ctrl+V → paste, Ctrl+D → duplicate in place
      if (isCtrl && event.key === "c") {
        const el = getSelectedElement();
        if (el) {
          setClipboardHtml(el.outerHTML);
        }
        return;
      }
      if (isCtrl && event.key === "v" && clipboardHtml) {
        event.preventDefault();
        insertClonedElement(clipboardHtml);
        return;
      }
      if (isCtrl && event.key === "d") {
        const el = getSelectedElement();
        if (el) {
          event.preventDefault();
          insertClonedElement(el.outerHTML);
        }
        return;
      }

      // Delete/Backspace → remove the selected canvas element (not the whole slide)
      if (event.key === "Delete" || event.key === "Backspace") {
        const el = getSelectedElement();
        if (!el) return;
        event.preventDefault();
        const doc = el.ownerDocument;
        const activeSlide = slides.find((s) => s.id === activeSlideId);
        el.remove();
        setSelectedLayerId(null);
        if (activeSlide) {
          useCarouselEditorStore.getState().updateSlideContent(activeSlide.id, doc.body.innerHTML, activeSlide.cssContent);
        }
        return;
      }

      // Arrow key slide navigation (no modifier)
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" && activeIndex < slides.length - 1) {
        handleSelectSlide(activeIndex + 1, slides[activeIndex + 1]!.id);
      }
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        handleSelectSlide(activeIndex - 1, slides[activeIndex - 1]!.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeIndex,
    slides,
    handleSelectSlide,
    undo,
    redo,
    getSelectedElement,
    setClipboardHtml,
    clipboardHtml,
    activeSlideId,
    insertClonedElement,
    setSelectedLayerId,
  ]);

  const handleExport = async () => {
    setExportError(null);
    try {
      const wasDirty = useCarouselEditorStore.getState().dirty;
      if (wasDirty) await persistOutput();
      const dirtyIds = useCarouselEditorStore.getState().pendingRenderSlideIds;
      await renderSlides.mutateAsync(dirtyIds.length ? dirtyIds : undefined);
      useCarouselEditorStore.getState().clearPendingRender();
      await runActions.requestExport();
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Erro ao exportar carrossel",
      );
    }
  };

  const handleDuplicateSlide = (slideId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateSlide(slideId);
  };

  const handleDeleteSlide = (slideId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    const newActive = index > 0 ? index - 1 : 0;
    deleteSlide(slideId);
    const remaining = useCarouselEditorStore.getState().slides;
    const targetIndex = Math.min(newActive, remaining.length - 1);
    if (remaining[targetIndex]) {
      setActiveIndex(targetIndex);
    }
  };

  // HTML5 drag-and-drop reorder handlers for the thumbnail strip.
  const handleThumbnailDragStart = (index: number, e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleThumbnailDrop = (toIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) return;
    reorderSlides(fromIndex, toIndex);
    setActiveIndex(toIndex);
    dragIndexRef.current = null;
  };

  const scaleLabel = `${Math.round(scale * 100)}%`;

  return (
    <div className="grid size-full grid-rows-[auto_1fr_auto]" data-testid="carousel-editor-shell">
      <header className="flex items-center gap-3 border-b border-[var(--line-default)] px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="flex size-8 items-center justify-center rounded-[var(--r-md)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          Slide {activeIndex + 1}/{slides.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {exportError ? (
            <span className="text-[12px] text-[var(--danger)]">{exportError}</span>
          ) : null}
          <button
            type="button"
            onClick={handleExport}
            disabled={renderSlides.isPending}
            className="flex items-center gap-1.5 rounded-[var(--r-md)] px-2.5 py-1.5 text-[12px] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            <Download className="size-3.5" />
            Exportar
          </button>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-[var(--r-md)] hover:bg-[var(--bg-hover)]"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[108px_1fr_320px]">
        {/* Thumbnail strip — 108px column leaves room for THUMB_WIDTH + p-3 padding + ring-2 */}
        <div className="flex shrink-0 gap-3 overflow-x-auto border-b border-[var(--line-default)] bg-[var(--bg-sunken)] p-3 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r">
          {slides.map((slide, index) => (
            <div
              key={getCarouselSlideReactKey(slide, index)}
              className="relative shrink-0 group"
              draggable
              onDragStart={(e) => handleThumbnailDragStart(index, e)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleThumbnailDrop(index, e)}
            >
              <button
                type="button"
                onClick={() => handleSelectSlide(index, slide.id)}
                className={cn(
                  "overflow-hidden rounded-[var(--r-md)] ring-2 ring-offset-1 transition-all",
                  index === activeIndex
                    ? "ring-[var(--accent)]"
                    : "ring-transparent opacity-70 hover:opacity-100",
                )}
                style={{ width: THUMB_WIDTH }}
              >
                <CarouselSlideRenderer slide={slide} displayWidth={THUMB_WIDTH} />
              </button>
              {/* Per-thumbnail action buttons, visible on hover */}
              <div className="absolute bottom-1 left-0 right-0 hidden justify-center gap-0.5 group-hover:flex">
                <button
                  type="button"
                  onClick={(e) => handleDuplicateSlide(slide.id, e)}
                  aria-label="Duplicar slide"
                  className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                >
                  <Copy className="size-2.5" />
                </button>
                {slides.length > 1 ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSlide(slide.id, index, e)}
                    aria-label="Excluir slide"
                    className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-red-600"
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas area — measures itself and derives scale automatically */}
        <div
          className={cn(
            "flex-1 flex-col overflow-hidden bg-[var(--editor-canvas-bg)]",
            panelTab === "content" ? "flex" : "hidden md:flex",
          )}
        >
          {/* Alignment toolbar — shown when a layer is selected */}
          <div className="flex justify-center border-b border-[var(--line-subtle)] px-3 py-1.5">
            <CarouselAlignToolbar
              getSelectedElement={getSelectedElement}
              onAligned={() => {
                const doc = canvasRef.current?.getContentDocument();
                const slide = slides.find((s) => s.id === activeSlideId);
                if (!doc || !slide) return;
                useCarouselEditorStore.getState().updateSlideContent(slide.id, doc.body.innerHTML, slide.cssContent);
              }}
            />
          </div>
          <div ref={canvasContainerRef} className="flex flex-1 items-center justify-center overflow-auto p-6">
            {activeSlide ? (
              <div className="relative shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
                <CarouselEditorCanvas
                  ref={canvasRef}
                  slide={activeSlide}
                  scale={scale}
                  onLoad={() => setLayersVersion((v) => v + 1)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <aside
          data-testid="carousel-editor-adjust-panel"
          className={cn(
            "flex-1 overflow-y-auto border-l border-[var(--line-default)] md:flex-none",
            panelTab === "adjust" ? "block" : "hidden md:block",
          )}
        >
          <Heading level="h4" as="h3" className="border-b border-[var(--line-subtle)] p-4">
            Ajustes
          </Heading>
          {activeSlide ? (
            <CarouselEditorLayersPanel
              slideId={activeSlide.id}
              layersVersion={layersVersion}
              getSelectedElement={getSelectedElement}
              getAllLayers={getAllLayers}
              getContentDocument={getContentDocument}
            />
          ) : null}
        </aside>
      </div>

      <div className="flex flex-col">
        {activeSlide ? <CarouselEditorAdjustBar runId={runId} slideId={activeSlide.id} /> : null}

        <div className="flex border-t border-[var(--line-subtle)] md:hidden">
          <button
            type="button"
            onClick={() => setPanelTab("content")}
            className={cn(
              "flex-1 py-2 text-[13px]",
              panelTab === "content" ? "text-[var(--accent)]" : "text-[var(--fg-secondary)]",
            )}
          >
            Slide
          </button>
          <button
            type="button"
            onClick={() => setPanelTab("adjust")}
            className={cn(
              "flex-1 py-2 text-[13px]",
              panelTab === "adjust" ? "text-[var(--accent)]" : "text-[var(--fg-secondary)]",
            )}
          >
            Ajustes
          </button>
        </div>

        <footer className="hidden items-center justify-between border-t border-[var(--line-subtle)] px-4 py-2 text-[12px] text-[var(--fg-quaternary)] md:flex">
          <span>← → navegar entre slides</span>
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Diminuir zoom"
              onClick={() => setZoomMultiplier((m) => Math.max(0.4, parseFloat((m - 0.1).toFixed(1))))}
              className="flex size-6 items-center justify-center rounded hover:bg-[var(--bg-hover)]"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-10 text-center font-mono tabular-nums">{scaleLabel}</span>
            <button
              type="button"
              aria-label="Aumentar zoom"
              onClick={() => setZoomMultiplier((m) => Math.min(2.0, parseFloat((m + 0.1).toFixed(1))))}
              className="flex size-6 items-center justify-center rounded hover:bg-[var(--bg-hover)]"
            >
              <Plus className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoomMultiplier(1.0)}
              className="rounded px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)]"
            >
              Ajustar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
