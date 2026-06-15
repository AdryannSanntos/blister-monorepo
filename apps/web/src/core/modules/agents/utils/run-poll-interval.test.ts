import { describe, expect, it } from "vitest";

import { runPollIntervalMs } from "./run-poll-interval";

describe("runPollIntervalMs", () => {
  it("polls while the run is actively executing", () => {
    expect(runPollIntervalMs("QUEUED")).toBe(2500);
    expect(runPollIntervalMs("RUNNING")).toBe(2500);
  });

  it("stops polling once the run reaches a terminal or waiting state", () => {
    expect(runPollIntervalMs("COMPLETED")).toBe(false);
    expect(runPollIntervalMs("FAILED")).toBe(false);
    expect(runPollIntervalMs("CANCELLED")).toBe(false);
    // Paused runs wait on human input — SSE drives the resume, no need to poll.
    expect(runPollIntervalMs("PAUSED")).toBe(false);
  });

  it("does not poll when the run status is unknown", () => {
    expect(runPollIntervalMs(undefined)).toBe(false);
    expect(runPollIntervalMs(null)).toBe(false);
  });
});
