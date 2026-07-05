import { create } from "zustand";
import type { CarouselOutputSlide } from "@company-os/types";

export type CarouselEditorPanelTab = "content" | "adjust";

type CarouselEditorState = {
  slides: CarouselOutputSlide[];
  activeSlideId: string | null;
  selectedLayerId: string | null;
  /** Slide ids with local edits that have not been rendered (as HTML/CSS -> image) yet. */
  dirtySlideIds: Set<string>;
  /** Derived: `dirtySlideIds.size > 0`. Kept in sync by every action below. */
  dirty: boolean;
  /** Derived: ordered snapshot of `dirtySlideIds`, ready to hand to the render mutation. */
  pendingRenderSlideIds: string[];
  panelTab: CarouselEditorPanelTab;
  setSlides: (slides: CarouselOutputSlide[]) => void;
  setActiveSlideId: (id: string) => void;
  setSelectedLayerId: (id: string | null) => void;
  updateSlideContent: (slideId: string, htmlContent: string, cssContent: string) => void;
  markSaved: () => void;
  /** Clears the pending-render set once the dirty slides have been rendered successfully. */
  clearPendingRender: () => void;
  setPanelTab: (tab: CarouselEditorPanelTab) => void;
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
};

const deriveDirtyFields = (dirtySlideIds: Set<string>) => ({
  dirtySlideIds,
  dirty: dirtySlideIds.size > 0,
  pendingRenderSlideIds: Array.from(dirtySlideIds),
});

export const useCarouselEditorStore = create<CarouselEditorState>((set) => ({
  ...initialState,
  setSlides: (slides) =>
    set((state) => ({
      slides,
      activeSlideId: state.activeSlideId ?? slides[0]?.id ?? null,
    })),
  setActiveSlideId: (id) => set({ activeSlideId: id, selectedLayerId: null }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  updateSlideContent: (slideId, htmlContent, cssContent) =>
    set((state) => {
      const dirtySlideIds = new Set(state.dirtySlideIds);
      dirtySlideIds.add(slideId);
      return {
        ...deriveDirtyFields(dirtySlideIds),
        slides: state.slides.map((slide) =>
          slide.id === slideId ? { ...slide, htmlContent, cssContent } : slide,
        ),
      };
    }),
  // Marks the autosave-to-server as complete. This intentionally does NOT clear
  // `dirtySlideIds`/`dirty`/`pendingRenderSlideIds`: those track slides that still
  // need a render pass, which only happens explicitly via `clearPendingRender`
  // after a successful render (see carousel-editor-shell's handleExport).
  markSaved: () => set({}),
  clearPendingRender: () => set(() => deriveDirtyFields(new Set())),
  setPanelTab: (tab) => set({ panelTab: tab }),
  reset: () =>
    set({
      ...initialState,
      dirtySlideIds: new Set(),
      pendingRenderSlideIds: [],
    }),
}));
