import { describe, expect, it } from "vitest";

import { AWAITING_CUT_REVIEW, AWAITING_RENDERS } from "./cuts-run-display";
import {
  OVERVIEW_ACTIVE_RUNS_POLL_MS,
  runPollIntervalMs,
} from "./run-poll-interval";

describe("runPollIntervalMs", () => {
  it("polls while the run is actively executing", () => {
    expect(runPollIntervalMs("QUEUED")).toBe(2500);
    expect(runPollIntervalMs("RUNNING")).toBe(2500);
  });

  it("polls when paused awaiting renders", () => {
    expect(runPollIntervalMs("PAUSED", AWAITING_RENDERS)).toBe(2500);
  });

  it("stops polling once the run reaches a terminal or waiting state", () => {
    expect(runPollIntervalMs("COMPLETED")).toBe(false);
    expect(runPollIntervalMs("FAILED")).toBe(false);
    expect(runPollIntervalMs("CANCELLED")).toBe(false);
    // Cut review waits on human input — SSE drives the resume, no need to poll.
    expect(runPollIntervalMs("PAUSED", AWAITING_CUT_REVIEW)).toBe(false);
    expect(runPollIntervalMs("PAUSED")).toBe(false);
  });

  it("does not poll when the run status is unknown", () => {
    expect(runPollIntervalMs(undefined)).toBe(false);
    expect(runPollIntervalMs(null)).toBe(false);
  });
});

describe("OVERVIEW_ACTIVE_RUNS_POLL_MS", () => {
  it("polls the overview every 20 seconds", () => {
    expect(OVERVIEW_ACTIVE_RUNS_POLL_MS).toBe(20_000);
  });
});
