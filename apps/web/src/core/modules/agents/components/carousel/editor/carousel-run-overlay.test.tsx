import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CarouselRunOverlay } from "./carousel-run-overlay";

vi.mock("src/core/modules/agents/hooks/use-carousel-run-detail", () => ({
  useCarouselRunDetail: () => ({
    isLoading: false,
    run: { status: "PAUSED", pauseReason: "awaiting_idea_selection" },
    phases: { ideas: { status: "awaiting_action" }, editor: { status: "idle" } },
    ideas: {
      status: "awaiting_action",
      data: [{ id: "idea_1", title: "Test", description: "Desc" }],
      selectedId: null,
    },
    content: { slides: [], isApproving: false },
    editor: { status: "idle", data: null, isExporting: false, exportDownloadUrl: null },
    actions: {
      selectIdea: vi.fn(),
      updateIdeaSelection: vi.fn(),
      submitCustomIdea: vi.fn(),
      approveContent: vi.fn(),
      requestExport: vi.fn(),
    },
    errorMessage: null,
    clearErrorMessage: vi.fn(),
  }),
}));

vi.mock("src/core/modules/agents/hooks/use-agent-run-mutations", () => ({
  useResumeAgentRun: () => ({ mutateAsync: vi.fn() }),
}));

describe("CarouselRunOverlay", () => {
  it("renders fullscreen dialog covering the viewport", () => {
    render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    expect(overlay).toHaveAttribute("role", "dialog");
    expect(overlay).toHaveAttribute("aria-modal", "true");
  });

  it("moves initial focus inside the dialog on mount", async () => {
    render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    await waitFor(() => {
      expect(overlay.contains(document.activeElement)).toBe(true);
    });
  });

  it("traps Tab focus: last focusable -> Tab -> first focusable", async () => {
    render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("traps Tab focus: first focusable -> Shift+Tab -> last focusable", async () => {
    render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("does not steal focus on a subsequent re-render (e.g. run polling) once the user has moved focus manually", async () => {
    const { rerender } = render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    await waitFor(() => {
      expect(overlay.contains(document.activeElement)).toBe(true);
    });

    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);
    const last = focusable[focusable.length - 1];

    // User manually moves focus away from the auto-focused first element.
    last.focus();
    expect(document.activeElement).toBe(last);

    // Simulate a re-render with the same runId (e.g. a status poll tick).
    rerender(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);

    expect(document.activeElement).toBe(last);
  });

  it("reapplies initial focus when runId changes without unmounting", async () => {
    const { rerender } = render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
    const overlay = screen.getByTestId("carousel-run-overlay");
    await waitFor(() => {
      expect(overlay.contains(document.activeElement)).toBe(true);
    });

    const focusableBefore = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusableBefore[0];
    const last = focusableBefore[focusableBefore.length - 1];

    // User moves focus away before navigating to another run.
    last.focus();
    expect(document.activeElement).toBe(last);

    // Navigate to a different run while the overlay stays mounted (no `key={runId}` upstream).
    rerender(<CarouselRunOverlay runId="run_2" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(document.activeElement).toBe(first);
    });
  });
});
