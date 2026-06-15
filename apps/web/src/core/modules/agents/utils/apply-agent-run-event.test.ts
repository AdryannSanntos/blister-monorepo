import type { AgentRunEvent } from "@company-os/types";
import { describe, expect, it } from "vitest";

import { applyAgentRunEvent } from "./apply-agent-run-event";
import type { AgentRunWithSteps } from "../hooks/use-agent-run";

const baseRun: AgentRunWithSteps = {
  run: {
    id: "run-1",
    agentId: "cuts",
    status: "RUNNING",
    inputPayload: {},
    outputPayload: {},
    reviewStatus: "PENDING",
    creditCost: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  steps: [],
  blocks: [],
};

describe("applyAgentRunEvent", () => {
  it("merges outputPayload on run_paused", () => {
    const event: AgentRunEvent = {
      type: "run_paused",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: {
        pauseReason: "awaiting_cut_review",
        outputPayload: {
          cuts: [
            {
              id: "cut-1",
              title: "Hook",
              description: "",
              startSec: 0,
              endSec: 60,
              durationSec: 60,
              viralScore: 80,
              reviewStatus: "pending",
              cutFileId: "file-1",
            },
          ],
        },
      },
    };

    const next = applyAgentRunEvent(baseRun, event);
    const cuts = (next?.run.outputPayload as { cuts?: unknown[] }).cuts;
    expect(next?.run.status).toBe("PAUSED");
    expect(Array.isArray(cuts)).toBe(true);
    expect(cuts).toHaveLength(1);
  });

  it("stores completed output on run_completed", () => {
    const event: AgentRunEvent = {
      type: "run_completed",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: {
        outputPayload: {
          cuts: [{ id: "cut-1" }],
          sourceFileId: "source-1",
        },
        totalCreditCost: 2,
      },
    };

    const next = applyAgentRunEvent(baseRun, event);
    expect(next?.run.status).toBe("COMPLETED");
    expect(next?.run.outputPayload).toMatchObject({
      sourceFileId: "source-1",
    });
  });
});
