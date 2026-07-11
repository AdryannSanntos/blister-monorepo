import { mapCarouselPipelineSubSteps } from "./carousel-pipeline-progress";

describe("mapCarouselPipelineSubSteps", () => {
  it("marks steps before currentStepKey as done and current as active", () => {
    const rows = mapCarouselPipelineSubSteps("render_slides");
    expect(rows.find((r) => r.key === "generate_slides")?.status).toBe("done");
    expect(rows.find((r) => r.key === "render_slides")?.status).toBe("active");
  });

  it("marks all steps done when currentStepKey is null and run completed", () => {
    const rows = mapCarouselPipelineSubSteps(null, { completed: true });
    expect(rows.every((r) => r.status === "done")).toBe(true);
  });
});
