import { create } from "zustand";
import type { CarouselOutputSlide } from "@company-os/types";

export type CarouselEditorPanelTab = "content" | "adjust";

type CarouselEditorState = {
  slides: CarouselOutputSlide[];
  activeSlideId: string | null;
  selectedLayerId: string | null;
  /** Slide ids with local edits that have not been rendered (as HTML/CSS -> image) yet. */
  dirtySlideIds: Set<string>;
  /**
   * Has unsaved local edits that still need to be persisted to the server.
   * This drives the debounced autosave and is cleared by `markSaved()` once the
   * PATCH succeeds. It is deliberately INDEPENDENT of `dirtySlideIds`/render
   * tracking: saving must not keep re-triggering itself, otherwise the autosave
   * effect loops forever issuing PATCH -> GET -> PATCH.
   */
  dirty: boolean;
  /** Ordered snapshot of `dirtySlideIds`, ready to hand to the render mutation. */
  pendingRenderSlideIds: string[];
  panelTab: CarouselEditorPanelTab;
  /** Clipboard for copy/paste of elements within slides (stores outerHTML). */
  clipboardHtml: string | null;
  /** Undo/redo history — each entry is a full slides snapshot. */
  history: CarouselOutputSlide[][];
  historyIndex: number;
  setSlides: (slides: CarouselOutputSlide[]) => void;
  setActiveSlideId: (id: string) => void;
  setSelectedLayerId: (id: string | null) => void;
  updateSlideContent: (slideId: string, htmlContent: string, cssContent: string) => void;
  markSaved: () => void;
  /** Clears the pending-render set once the dirty slides have been rendered successfully. */
  clearPendingRender: () => void;
  setPanelTab: (tab: CarouselEditorPanelTab) => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setClipboardHtml: (html: string | null) => void;
  /** Push current slides onto the undo stack before a structural edit. */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  /**
   * Resets all transient editor state back to its initial values. Must be
   * called whenever the editor starts working on a different run (this store
   * is a global singleton, not scoped per-run), so that leftover state from a
   * previous run (e.g. `dirty`/`dirtySlideIds` from an unsaved edit that was
   * never rendered) cannot block or corrupt the sync of a different run's
   * `output.slides`.
   */
  reset: () => void;
};

const initialState = {
  slides: [] as CarouselOutputSlide[],
  activeSlideId: null as string | null,
  selectedLayerId: null as string | null,
  dirtySlideIds: new Set<string>(),
  dirty: false,
  pendingRenderSlideIds: [] as string[],
  panelTab: "content" as CarouselEditorPanelTab,
  clipboardHtml: null as string | null,
  history: [] as CarouselOutputSlide[][],
  historyIndex: -1,
};

const HISTORY_LIMIT = 50;

// `history[i]` holds the FULL slides snapshot as it existed right after the i-th
// action (history[0] is the baseline loaded from the server). `historyIndex` always
// points at the entry that matches the live `slides` state. Pushing the post-edit
// snapshot (rather than the pre-edit one) keeps undo/redo indices in lockstep —
// undo steps to `historyIndex - 1`, redo steps to `historyIndex + 1`, both directly
// addressable without any off-by-one adjustment.
const withHistoryPush = (
  state: Pick<CarouselEditorState, "history" | "historyIndex">,
  newSlides: CarouselOutputSlide[],
): Pick<CarouselEditorState, "history" | "historyIndex"> => {
  const truncated = state.history.slice(0, state.historyIndex + 1);
  const newHistory = [...truncated, newSlides.map((s) => ({ ...s }))];
  if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
};

// Every mutating action flags `dirty: true` (needs save) alongside updating the
// render-pending set. The two are cleared by different lifecycles: `dirty` by
// `markSaved()` (after the autosave PATCH), the render set by `clearPendingRender()`
// (after an explicit render/export).
const deriveDirtyFields = (dirtySlideIds: Set<string>) => ({
  dirtySlideIds,
  dirty: true,
  pendingRenderSlideIds: Array.from(dirtySlideIds),
});

export const useCarouselEditorStore = create<CarouselEditorState>((set) => ({
  ...initialState,
  setSlides: (slides) =>
    set((state) => ({
      slides,
      activeSlideId: state.activeSlideId ?? slides[0]?.id ?? null,
      // Seed the undo baseline only the first time slides land (post-`reset()`).
      // Later re-syncs from the server (polling while not dirty) must not wipe
      // the in-progress undo/redo stack.
      ...(state.history.length === 0
        ? { history: [slides.map((s) => ({ ...s }))], historyIndex: 0 }
        : null),
    })),
  setActiveSlideId: (id) => set({ activeSlideId: id, selectedLayerId: null }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  updateSlideContent: (slideId, htmlContent, cssContent) =>
    set((state) => {
      const newSlides = state.slides.map((slide) =>
        slide.id === slideId ? { ...slide, htmlContent, cssContent } : slide,
      );
      const dirtySlideIds = new Set(state.dirtySlideIds);
      dirtySlideIds.add(slideId);
      return {
        slides: newSlides,
        ...withHistoryPush(state, newSlides),
        ...deriveDirtyFields(dirtySlideIds),
      };
    }),
  pushHistory: () => set((state) => withHistoryPush(state, state.slides)),
  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const targetIndex = state.historyIndex - 1;
      const restoredSlides = state.history[targetIndex];
      if (!restoredSlides) return state;
      const dirtySlideIds = new Set(restoredSlides.map((s) => s.id));
      return {
        slides: restoredSlides,
        historyIndex: targetIndex,
        ...deriveDirtyFields(dirtySlideIds),
      };
    }),
  redo: () =>
    set((state) => {
      const targetIndex = state.historyIndex + 1;
      const restoredSlides = state.history[targetIndex];
      if (!restoredSlides) return state;
      const dirtySlideIds = new Set(restoredSlides.map((s) => s.id));
      return { slides: restoredSlides, historyIndex: targetIndex, ...deriveDirtyFields(dirtySlideIds) };
    }),
  setClipboardHtml: (html) => set({ clipboardHtml: html }),
  duplicateSlide: (slideId) =>
    set((state) => {
      const idx = state.slides.findIndex((s) => s.id === slideId);
      if (idx < 0) return state;
      const original = state.slides[idx];
      if (!original) return state;
      const clone = { ...original, id: crypto.randomUUID(), order: original.order };
      const newSlides = [...state.slides];
      newSlides.splice(idx + 1, 0, clone);
      const renumbered = newSlides.map((s, i) => ({ ...s, order: i + 1 }));
      const dirtySlideIds = new Set(state.dirtySlideIds);
      dirtySlideIds.add(clone.id);
      return { slides: renumbered, ...withHistoryPush(state, renumbered), ...deriveDirtyFields(dirtySlideIds) };
    }),
  deleteSlide: (slideId) =>
    set((state) => {
      if (state.slides.length <= 1) return state;
      const newSlides = state.slides
        .filter((s) => s.id !== slideId)
        .map((s, i) => ({ ...s, order: i + 1 }));
      const dirtySlideIds = new Set(state.dirtySlideIds);
      dirtySlideIds.delete(slideId);
      const newActiveId =
        state.activeSlideId === slideId ? (newSlides[0]?.id ?? null) : state.activeSlideId;
      return {
        slides: newSlides,
        activeSlideId: newActiveId,
        selectedLayerId: null,
        ...withHistoryPush(state, newSlides),
        ...deriveDirtyFields(dirtySlideIds),
      };
    }),
  reorderSlides: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return state;
      const newSlides = [...state.slides];
      const [moved] = newSlides.splice(fromIndex, 1);
      if (!moved) return state;
      newSlides.splice(toIndex, 0, moved);
      const renumbered = newSlides.map((s, i) => ({ ...s, order: i + 1 }));
      const dirtySlideIds = new Set(renumbered.map((s) => s.id));
      return { slides: renumbered, ...withHistoryPush(state, renumbered), ...deriveDirtyFields(dirtySlideIds) };
    }),
  // Marks the autosave-to-server as complete: clears only the `dirty` (needs-save)
  // flag so the autosave effect stops re-firing. It intentionally does NOT clear
  // `dirtySlideIds`/`pendingRenderSlideIds`: those track slides that still need a
  // render pass, which only happens explicitly via `clearPendingRender` after a
  // successful render (see carousel-editor-shell's handleExport).
  markSaved: () => set({ dirty: false }),
  clearPendingRender: () =>
    set({ dirtySlideIds: new Set(), pendingRenderSlideIds: [] }),
  setPanelTab: (tab) => set({ panelTab: tab }),
  reset: () =>
    set({
      ...initialState,
      dirtySlideIds: new Set(),
      pendingRenderSlideIds: [],
      history: [],
      historyIndex: -1,
    }),
}));
