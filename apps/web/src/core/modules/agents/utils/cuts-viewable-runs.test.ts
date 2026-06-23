import type { AgentRunStatusDto } from "@company-os/types";
import { describe, expect, it } from "vitest";

import {
  filterViewableRuns,
  getOverviewCardProgressPercent,
  hasProcessingRuns,
  isProcessingRun,
  isViewableRun,
  toViewableRun,
} from "./cuts-viewable-runs";

const baseRun = (
  overrides: Partial<AgentRunStatusDto> = {},
): AgentRunStatusDto => ({
  id: "run-1",
  agentId: "cuts",
  companyId: "company-1",
  campaignId: null,
  status: "COMPLETED",
  currentStepKey: null,
  inputPayload: { userInput: "My video.mp4" },
  outputPayload: { cuts: [{ id: "cut-1", title: "Hook", startSec: 0, endSec: 30 }] },
  errorMessage: null,
  pauseReason: null,
  pauseFormSchema: null,
  reviewStatus: "PENDING_REVIEW",
  creditCost: 2.5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  startedAt: null,
  completedAt: null,
  ...overrides,
});

describe("isViewableRun", () => {
  it("returns true for COMPLETED runs", () => {
    expect(isViewableRun(baseRun({ status: "COMPLETED" }))).toBe(true);
  });

  it("returns true for PAUSED runs", () => {
    expect(isViewableRun(baseRun({ status: "PAUSED" }))).toBe(true);
  });

  it("returns true for FAILED runs", () => {
    expect(isViewableRun(baseRun({ status: "FAILED", outputPayload: {} }))).toBe(
      true,
    );
  });

  it("returns true for RUNNING and QUEUED runs", () => {
    expect(isViewableRun(baseRun({ status: "RUNNING" }))).toBe(true);
    expect(isViewableRun(baseRun({ status: "QUEUED" }))).toBe(true);
  });

  it("returns false for CANCELLED runs", () => {
    expect(isViewableRun(baseRun({ status: "CANCELLED" }))).toBe(false);
  });
});

describe("isProcessingRun", () => {
  it("detects in-flight runs", () => {
    expect(isProcessingRun(baseRun({ status: "QUEUED" }))).toBe(true);
    expect(isProcessingRun(baseRun({ status: "RUNNING" }))).toBe(true);
    expect(
      isProcessingRun(
        baseRun({ status: "PAUSED", pauseReason: "awaiting_renders" }),
      ),
    ).toBe(true);
    expect(isProcessingRun(baseRun({ status: "COMPLETED" }))).toBe(false);
  });
});

describe("hasProcessingRuns", () => {
  it("returns true when any run is processing", () => {
    expect(
      hasProcessingRuns([
        baseRun({ id: "run-1", status: "COMPLETED" }),
        baseRun({ id: "run-2", status: "RUNNING" }),
      ]),
    ).toBe(true);
  });
});

describe("getOverviewCardProgressPercent", () => {
  it("returns null for completed runs", () => {
    expect(getOverviewCardProgressPercent(baseRun({ status: "COMPLETED" }))).toBe(
      null,
    );
  });

  it("returns a percent for queued runs", () => {
    expect(getOverviewCardProgressPercent(baseRun({ status: "QUEUED" }))).toBe(8);
  });
});

describe("toViewableRun", () => {
  it("maps source title and cut counts", () => {
    const viewable = toViewableRun(baseRun());
    expect(viewable.sourceTitle).toBe("My video.mp4");
    expect(viewable.cutsCount).toBe(1);
    expect(viewable.approvedCount).toBe(0);
  });
});

describe("filterViewableRuns", () => {
  it("includes completed and in-flight runs", () => {
    const runs = [
      baseRun({ id: "run-1", status: "COMPLETED" }),
      baseRun({ id: "run-2", status: "RUNNING" }),
      baseRun({ id: "run-3", status: "PAUSED" }),
      baseRun({ id: "run-4", status: "CANCELLED" }),
    ];

    const result = filterViewableRuns(runs);
    expect(result).toHaveLength(3);
    expect(result.map((run) => run.id)).toEqual(["run-1", "run-2", "run-3"]);
  });
});
