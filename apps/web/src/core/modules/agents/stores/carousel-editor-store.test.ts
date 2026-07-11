import { useCarouselEditorStore } from "./carousel-editor-store";

const slide = {
  id: "s1",
  order: 1,
  type: "text" as const,
  htmlContent: "<h1>A</h1>",
  cssContent: "",
};

beforeEach(() =>
  useCarouselEditorStore.setState({
    slides: [],
    activeSlideId: null,
    dirty: false,
    dirtySlideIds: new Set(),
    pendingRenderSlideIds: [],
    history: [],
    historyIndex: -1,
  }),
);

describe("carousel-editor-store", () => {
  it("sets first slide as active on load", () => {
    useCarouselEditorStore.getState().setSlides([slide]);
    expect(useCarouselEditorStore.getState().activeSlideId).toBe("s1");
  });

  it("marks dirty after content update", () => {
    useCarouselEditorStore.getState().setSlides([slide]);
    useCarouselEditorStore.getState().updateSlideContent("s1", "<h1>B</h1>", "");
    expect(useCarouselEditorStore.getState().dirty).toBe(true);
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>B</h1>");
  });

  it("tracks which slide ids are dirty independently", () => {
    const store = useCarouselEditorStore.getState();
    store.setSlides([{ id: "a", htmlContent: "", cssContent: "", order: 1 } as never]);
    store.updateSlideContent("a", "<p>x</p>", "");
    expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual(["a"]);
    store.clearPendingRender();
    expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual([]);
  });

  it("clears the save flag on markSaved but keeps the render-pending set", () => {
    const store = useCarouselEditorStore.getState();
    store.setSlides([slide]);
    store.updateSlideContent("s1", "<h1>B</h1>", "");
    store.markSaved();
    // `dirty` (needs-save) clears so the autosave effect stops re-firing...
    expect(useCarouselEditorStore.getState().dirty).toBe(false);
    // ...but the slide still needs a render pass until an explicit render/export.
    expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual(["s1"]);
  });

  it("undo/redo steps one edit at a time, in lockstep, across multiple edits", () => {
    const store = useCarouselEditorStore.getState();
    store.setSlides([slide]);
    store.updateSlideContent("s1", "<h1>B</h1>", ""); // edit 1
    store.updateSlideContent("s1", "<h1>C</h1>", ""); // edit 2

    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>C</h1>");

    store.undo(); // should land on edit 1's result, not skip past it
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>B</h1>");

    store.undo(); // back to the original baseline
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>A</h1>");

    store.undo(); // no-op — already at the oldest entry
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>A</h1>");

    store.redo();
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>B</h1>");

    store.redo();
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>C</h1>");

    store.redo(); // no-op — already at the newest entry
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>C</h1>");
  });
});
