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

  it("does not clear dirtySlideIds on markSaved (only render clears it)", () => {
    const store = useCarouselEditorStore.getState();
    store.setSlides([slide]);
    store.updateSlideContent("s1", "<h1>B</h1>", "");
    store.markSaved();
    expect(useCarouselEditorStore.getState().dirty).toBe(true);
    expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual(["s1"]);
  });
});
