import { act, render, screen } from "@testing-library/react";
import type { CarouselOutput } from "@company-os/types";
import { CarouselEditorShell } from "./carousel-editor-shell";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";

// jsdom does not implement ResizeObserver; stub it so the dynamic-scale effect runs without error.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("src/core/modules/agents/components/carousel/editor/carousel-editor-adjust-bar", () => ({
  CarouselEditorAdjustBar: () => <div data-testid="adjust-bar" />,
}));

vi.mock("src/core/modules/agents/components/carousel/editor/carousel-editor-canvas", () => ({
  CarouselEditorCanvas: () => <div data-testid="canvas" />,
}));

vi.mock("src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel", () => ({
  CarouselEditorLayersPanel: () => <div data-testid="layers-panel" />,
}));

vi.mock("src/core/modules/agents/components/carousel/carousel-slide-renderer", () => ({
  CAROUSEL_SLIDE_WIDTH: 1080,
  CAROUSEL_SLIDE_HEIGHT: 1350,
  CarouselSlideRenderer: ({ slide }: { slide: { id: string; htmlContent: string } }) => (
    <div data-testid={`thumb-${slide.id}`}>{slide.htmlContent}</div>
  ),
}));

const editOutputMutateAsync = vi.fn();
vi.mock("src/core/modules/agents/hooks/use-agent-run-mutations", () => ({
  useEditAgentRunOutput: () => ({ mutateAsync: editOutputMutateAsync, isPending: false }),
}));

vi.mock("src/core/modules/agents/hooks/use-carousel-render", () => ({
  useCarouselRender: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("src/core/modules/agents/hooks/use-carousel-run-detail", () => ({
  useCarouselRunDetail: () => ({
    actions: { requestExport: vi.fn() },
  }),
}));

const makeSlide = (id: string, htmlContent: string) => ({
  id,
  order: 0,
  type: "start" as const,
  htmlContent,
  cssContent: "",
});

const makeOutput = (htmlContent: string): CarouselOutput => ({
  socialNetwork: "instagram",
  templateId: "content-machine",
  slides: [makeSlide("slide_1", htmlContent)],
});

const makeMultiSlideOutput = (): CarouselOutput => ({
  socialNetwork: "instagram",
  templateId: "content-machine",
  slides: [
    makeSlide("slide_1", "slide one"),
    makeSlide("slide_2", "slide two"),
    makeSlide("slide_3", "slide three"),
  ],
});

describe("CarouselEditorShell", () => {
  beforeEach(() => {
    useCarouselEditorStore.setState({
      slides: [],
      activeSlideId: null,
      selectedLayerId: null,
      dirty: false,
      dirtySlideIds: new Set(),
      pendingRenderSlideIds: [],
      panelTab: "content",
    });
    editOutputMutateAsync.mockReset();
  });

  it("does not overwrite local slides when dirty and output.slides gets a new reference", () => {
    const initialOutput = makeOutput("original content");
    const { rerender } = render(
      <CarouselEditorShell runId="run_1" output={initialOutput} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("original content");

    // Simulate a local, unsaved edit.
    act(() => {
      useCarouselEditorStore.setState((state) => ({
        dirty: true,
        slides: state.slides.map((slide) =>
          slide.id === "slide_1" ? { ...slide, htmlContent: "edited content" } : slide,
        ),
      }));
    });

    // Simulate a poll that produces a new array/object reference with the same (stale) content.
    const polledOutput = makeOutput("original content");
    rerender(<CarouselEditorShell runId="run_1" output={polledOutput} onClose={vi.fn()} />);

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("edited content");
  });

  it("keeps the just-saved edit after persistOutput resolves, then applies a real refetch", () => {
    const initialOutput = makeOutput("original content");
    const { rerender } = render(
      <CarouselEditorShell runId="run_1" output={initialOutput} onClose={vi.fn()} />,
    );

    // Simulate a local, unsaved edit.
    act(() => {
      useCarouselEditorStore.setState((state) => ({
        dirty: true,
        slides: state.slides.map((slide) =>
          slide.id === "slide_1" ? { ...slide, htmlContent: "edited content" } : slide,
        ),
      }));
    });

    // An unrelated server snapshot arrives while dirty (e.g. a poll for another
    // slide rendering); it predates the edit and must be ignored, not buffered.
    const staleServerOutput = makeOutput("original content");
    rerender(<CarouselEditorShell runId="run_1" output={staleServerOutput} onClose={vi.fn()} />);

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("edited content");

    // The edit finishes saving (persistOutput -> markSaved). `markSaved` only
    // acknowledges the autosave-to-server; it deliberately does NOT clear
    // `dirtySlideIds`/`pendingRenderSlideIds` (Task 8), since the slide still
    // needs a render pass. So the UI must keep showing the just-saved edit
    // rather than reverting to any stale snapshot.
    act(() => {
      useCarouselEditorStore.getState().markSaved();
    });

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("edited content");

    // A subsequent real refetch (e.g. triggered by the edit mutation's
    // invalidation) brings the persisted content back from the server. It is
    // still ignored by the sync effect here because the slide remains
    // render-pending (dirty), but the content happens to match anyway.
    const refetchedOutput = makeOutput("edited content");
    rerender(<CarouselEditorShell runId="run_1" output={refetchedOutput} onClose={vi.fn()} />);

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("edited content");

    // Once the render pass actually completes (handleExport calling
    // clearPendingRender), the slide is no longer render-pending, so a later,
    // genuinely new server update is applied normally again.
    act(() => {
      useCarouselEditorStore.getState().clearPendingRender();
    });

    const laterServerOutput = makeOutput("server final content");
    rerender(<CarouselEditorShell runId="run_1" output={laterServerOutput} onClose={vi.fn()} />);

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("server final content");
  });

  it("resets the store when runId changes, so a dirty edit on run A never blocks run B's slides", () => {
    const runAOutput = makeOutput("run a content");
    const { rerender } = render(
      <CarouselEditorShell runId="run_a" output={runAOutput} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("run a content");

    // Edit run A's slide and leave it dirty (autosaved but never rendered),
    // then "close" the editor without exporting -- the store is a global
    // singleton, so this state would otherwise leak into the next run.
    act(() => {
      useCarouselEditorStore.setState((state) => ({
        dirty: true,
        dirtySlideIds: new Set(["slide_1"]),
        pendingRenderSlideIds: ["slide_1"],
        slides: state.slides.map((slide) =>
          slide.id === "slide_1" ? { ...slide, htmlContent: "run a edited content" } : slide,
        ),
      }));
    });

    expect(useCarouselEditorStore.getState().dirty).toBe(true);

    // Open the editor for a different run (run B), with its own output.
    const runBOutput = makeOutput("run b content");
    rerender(<CarouselEditorShell runId="run_b" output={runBOutput} onClose={vi.fn()} />);

    // Run B's content must be shown -- not blocked by run A's leftover dirty
    // flag, and not overwritten with run A's edited content.
    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("run b content");
    expect(useCarouselEditorStore.getState().dirty).toBe(false);
    expect(useCarouselEditorStore.getState().dirtySlideIds.size).toBe(0);
    expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual([]);
  });

  it("applies new output.slides when not dirty", () => {
    const initialOutput = makeOutput("original content");
    const { rerender } = render(
      <CarouselEditorShell runId="run_1" output={initialOutput} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("original content");

    const updatedOutput = makeOutput("server updated content");
    rerender(<CarouselEditorShell runId="run_1" output={updatedOutput} onClose={vi.fn()} />);

    expect(screen.getByTestId("thumb-slide_1").textContent).toBe("server updated content");
  });

  describe("mobile tabs (Slide/Ajustes)", () => {
    it("shows the canvas and hides the adjust panel by default (panelTab = content)", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      expect(useCarouselEditorStore.getState().panelTab).toBe("content");
      // The canvas column wraps the mocked canvas in a `relative` div; its
      // grandparent is the column that toggles visibility via className.
      const canvasColumn = screen.getByTestId("canvas").parentElement?.parentElement;
      expect(canvasColumn?.className).toContain("flex");
      expect(canvasColumn?.className).not.toContain("hidden");
      expect(screen.getByTestId("carousel-editor-adjust-panel").className).toContain("hidden");
    });

    it("clicking 'Ajustes' sets panelTab and reveals the adjust panel", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      act(() => {
        screen.getByRole("button", { name: "Ajustes" }).click();
      });

      expect(useCarouselEditorStore.getState().panelTab).toBe("adjust");
      expect(screen.getByTestId("carousel-editor-adjust-panel").className).not.toContain("hidden");
      expect(screen.getByTestId("carousel-editor-adjust-panel").className).toContain("block");
    });

    it("clicking 'Slide' after 'Ajustes' switches panelTab back to content", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      act(() => {
        screen.getByRole("button", { name: "Ajustes" }).click();
      });
      expect(useCarouselEditorStore.getState().panelTab).toBe("adjust");

      act(() => {
        screen.getByRole("button", { name: "Slide" }).click();
      });

      expect(useCarouselEditorStore.getState().panelTab).toBe("content");
      expect(screen.getByTestId("carousel-editor-adjust-panel").className).toContain("hidden");
    });
  });

  describe("keyboard navigation", () => {
    it("advances to the next slide on ArrowRight", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });

      expect(screen.getByText("Slide 2/3")).toBeInTheDocument();
    });

    it("goes back to the previous slide on ArrowLeft", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      expect(screen.getByText("Slide 2/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      });
      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();
    });

    it("does not navigate past the last or before the first slide", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      });
      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      expect(screen.getByText("Slide 3/3")).toBeInTheDocument();
    });

    it("ignores arrow keys when focus is on a text input", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });

      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();
      document.body.removeChild(input);
    });

    it("ignores arrow keys when focus is on a Radix slider thumb (role=slider)", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      const thumb = document.createElement("span");
      thumb.setAttribute("role", "slider");
      document.body.appendChild(thumb);
      thumb.focus();

      act(() => {
        thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });

      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();
      document.body.removeChild(thumb);
    });

    it("does not advance the slide on ArrowRight when a system modifier key is held", () => {
      render(
        <CarouselEditorShell runId="run_1" output={makeMultiSlideOutput()} onClose={vi.fn()} />,
      );

      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", metaKey: true, bubbles: true }),
        );
      });
      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", ctrlKey: true, bubbles: true }),
        );
      });
      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true }),
        );
      });
      expect(screen.getByText("Slide 1/3")).toBeInTheDocument();
    });
  });
});
