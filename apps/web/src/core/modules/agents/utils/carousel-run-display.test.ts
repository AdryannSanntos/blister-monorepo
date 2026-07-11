import { deriveCarouselPhases, isCarouselRunActive } from "./carousel-run-display";

const baseRun = {
  id: "run_1",
  status: "RUNNING" as const,
  pauseReason: null,
  currentStepKey: "generate_content",
  inputPayload: {},
  outputPayload: null,
  errorMessage: null,
};

describe("deriveCarouselPhases (2-phase model)", () => {
  it("marks editor as processing while pipeline runs after idea selection", () => {
    const steps = [
      { stepKey: "generate_ideas", status: "COMPLETED" as const },
      { stepKey: "await_idea_selection", status: "COMPLETED" as const },
      { stepKey: "generate_content", status: "RUNNING" as const },
    ];
    const phases = deriveCarouselPhases({ run: baseRun as never, steps: steps as never });
    expect(phases.ideas.status).toBe("completed");
    expect(phases.editor.status).toBe("processing");
  });

  it("marks editor as completed when run is COMPLETED", () => {
    const run = { ...baseRun, status: "COMPLETED" as const, currentStepKey: null };
    const phases = deriveCarouselPhases({ run: run as never, steps: [] });
    expect(phases.editor.status).toBe("completed");
  });

  it("marks ideas as awaiting_action while paused for idea selection", () => {
    const run = { ...baseRun, status: "PAUSED" as const, pauseReason: "awaiting_idea_selection" };
    const phases = deriveCarouselPhases({ run: run as never, steps: [] });
    expect(phases.ideas.status).toBe("awaiting_action");
    expect(phases.editor.status).toBe("idle");
  });

  it("marks editor as awaiting_action while paused for content approval", () => {
    const run = {
      ...baseRun,
      status: "PAUSED" as const,
      pauseReason: "awaiting_content_approval",
    };
    const steps = [
      { stepKey: "generate_ideas", status: "COMPLETED" as const },
      { stepKey: "await_idea_selection", status: "COMPLETED" as const },
    ];
    const phases = deriveCarouselPhases({ run: run as never, steps: steps as never });
    expect(phases.editor.status).toBe("awaiting_action");
  });
});

describe("isCarouselRunActive", () => {
  it("treats content approval pause as active so SSE stays connected", () => {
    expect(
      isCarouselRunActive({
        status: "PAUSED",
        pauseReason: "awaiting_content_approval",
      }),
    ).toBe(true);
  });

  it("returns false for terminal runs", () => {
    expect(isCarouselRunActive({ status: "COMPLETED", pauseReason: null })).toBe(
      false,
    );
  });
});
