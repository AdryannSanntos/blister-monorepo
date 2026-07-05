"use client";

import type { CarouselOutput } from "@company-os/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, X, Download } from "lucide-react";

import { CarouselEditorAdjustBar } from "src/core/modules/agents/components/carousel/editor/carousel-editor-adjust-bar";
import {
  CarouselEditorCanvas,
  type CarouselEditorCanvasHandle,
} from "src/core/modules/agents/components/carousel/editor/carousel-editor-canvas";
import { CarouselEditorLayersPanel } from "src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel";
import { CarouselSlideRenderer } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { useEditAgentRunOutput } from "src/core/modules/agents/hooks/use-agent-run-mutations";
import { useCarouselRender } from "src/core/modules/agents/hooks/use-carousel-render";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
import { getCarouselSlideReactKey } from "src/core/modules/agents/utils/carousel-run-display";
import { Heading } from "src/core/shared/components/ui/heading";
import { cn } from "src/core/shared/utils";

const THUMB_WIDTH = 72;
const CANVAS_SCALE = 0.45;

type Props = {
  runId: string;
  output: CarouselOutput;
  onClose: () => void;
};

export const CarouselEditorShell = ({ runId, output, onClose }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
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

  const editOutput = useEditAgentRunOutput(runId, "carousel");
  const renderSlides = useCarouselRender(runId);
  const { actions: runActions } = useCarouselRunDetail(runId);

  // Tracks the most recently synced run so a change in `runId` can be
  // detected inside the effect below without adding `runId` as a second,
  // separately-ordered effect (see the reset call inside the sync effect).
  const lastSyncedRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    // This store is a global singleton shared by every run's editor
    // instance, so switching to a different `runId` must wipe any leftover
    // transient state (`dirty`/`dirtySlideIds`/`pendingRenderSlideIds`,
    // selection, etc.) from the previous run *before* applying this run's
    // `output.slides` below. Otherwise a `dirty` flag left over from an
    // unsaved-but-unrendered edit on the previous run would block this
    // run's slides from ever being applied (cross-run content bleed).
    if (lastSyncedRunIdRef.current !== runId) {
      lastSyncedRunIdRef.current = runId;
      reset();
      setSlides(output.slides);
      return;
    }

    // Only react to a new `output.slides` reference (a real fetch/refetch),
    // not to `dirty` merely flipping back to false. If `dirty` were in the
    // dependency array, `markSaved()` (called right after a successful save,
    // before the resulting refetch lands) would re-run this effect against
    // the still-stale `output.slides` prop and briefly revert the edit that
    // was just persisted. Reading `dirty` here (without depending on it)
    // means: whenever a genuinely new slides snapshot arrives, apply it if
    // there is no local edit in flight at that moment; while dirty, ignore
    // in-progress snapshots entirely (they predate the edit and would be
    // lost) and rely on the invalidation-triggered refetch to bring the
    // real, merged server state once the edit is saved.
    if (useCarouselEditorStore.getState().dirty) return;
    setSlides(output.slides);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [runId, output.slides, setSlides, reset]);

  const activeSlide =
    slides.find((slide) => slide.id === activeSlideId) ?? slides[activeIndex] ?? null;

  const getSelectedElement = useCallback((): HTMLElement | null => {
    const doc = canvasRef.current?.getContentDocument();
    const layerId = useCarouselEditorStore.getState().selectedLayerId;
    if (!doc || !layerId) return null;
    return doc.querySelector<HTMLElement>(`[data-carousel-layer-id="${layerId}"]`);
  }, []);

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

  const handleSelectSlide = useCallback((index: number, slideId: string) => {
    setActiveIndex(index);
    setActiveSlideId(slideId);
  }, [setActiveSlideId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore navigation shortcuts combined with system/browser modifiers
      // (e.g. Cmd+ArrowLeft for browser back, Ctrl+ArrowRight for tab
      // switching) so this handler doesn't hijack them as slide navigation.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      // Guard against stealing arrow keys from text inputs and from Radix
      // Slider thumbs. Radix renders its thumb as a focusable
      // `<span role="slider">` (not an `<input>`), and ArrowLeft/ArrowRight
      // on a focused slider thumb are the standard way to adjust its value
      // — that must not also flip the active carousel slide (e.g. the zoom
      // slider in the layers panel). `event.target` can also be `window`
      // itself (no matching DOM element focused), which is not an `Element`
      // and has neither `tagName` nor `getAttribute`/`closest`.
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("role") === "slider" ||
          target.closest('[role="slider"]'))
      ) {
        return;
      }

      if (event.key === "ArrowRight" && activeIndex < slides.length - 1) {
        handleSelectSlide(activeIndex + 1, slides[activeIndex + 1].id);
      }
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        handleSelectSlide(activeIndex - 1, slides[activeIndex - 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, slides, handleSelectSlide]);

  const handleExport = async () => {
    setExportError(null);
    try {
      const wasDirty = useCarouselEditorStore.getState().dirty;
      if (wasDirty) {
        await persistOutput();
      }
      // `persistOutput`/`markSaved` never clear `pendingRenderSlideIds` (only a
      // successful render does, via `clearPendingRender` below), so reading it
      // after the save is equivalent to reading it before — it still reflects
      // exactly the slides edited since the last successful render.
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

      <div className="flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[72px_1fr_320px]">
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--line-default)] p-2 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r">
          {slides.map((slide, index) => (
            <button
              key={getCarouselSlideReactKey(slide, index)}
              type="button"
              onClick={() => handleSelectSlide(index, slide.id)}
              className={cn(
                "shrink-0 overflow-hidden rounded-[var(--r-md)] border-2",
                index === activeIndex
                  ? "border-[var(--accent)]"
                  : "border-transparent opacity-70",
              )}
            >
              <CarouselSlideRenderer slide={slide} displayWidth={THUMB_WIDTH} />
            </button>
          ))}
        </div>

        <div
          className={cn(
            "flex-1 items-center justify-center overflow-auto bg-[var(--bg-canvas)] p-6",
            panelTab === "content" ? "flex" : "hidden md:flex",
          )}
        >
          {activeSlide ? (
            <div className="relative">
              <CarouselEditorCanvas ref={canvasRef} slide={activeSlide} scale={CANVAS_SCALE} />
            </div>
          ) : null}
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
            <CarouselEditorLayersPanel slideId={activeSlide.id} getSelectedElement={getSelectedElement} />
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

        <footer className="hidden border-t border-[var(--line-subtle)] px-4 py-2.5 text-[12px] text-[var(--fg-quaternary)] md:block">
          ← → navegar entre slides
        </footer>
      </div>
    </div>
  );
};
