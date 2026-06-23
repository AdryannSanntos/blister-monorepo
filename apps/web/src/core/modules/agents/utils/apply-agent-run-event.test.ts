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
    reviewStatus: "PENDING_REVIEW",
    creditCost: 0,
    companyId: "company-1",
    campaignId: null,
    currentStepKey: null,
    errorMessage: null,
    pauseReason: null,
    pauseFormSchema: null,
    startedAt: null,
    completedAt: null,
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

  it("marks resolve_source running on step_started", () => {
    const event: AgentRunEvent = {
      type: "step_started",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: { stepKey: "resolve_source", stepIndex: 0 },
    };

    const next = applyAgentRunEvent(
      { ...baseRun, run: { ...baseRun.run, status: "QUEUED" } },
      event,
    );

    expect(next?.run.status).toBe("RUNNING");
    expect(next?.steps).toHaveLength(1);
    expect(next?.steps[0]?.stepKey).toBe("resolve_source");
    expect(next?.steps[0]?.status).toBe("RUNNING");
  });

  it("marks step completed on step_completed", () => {
    const withStep: AgentRunWithSteps = {
      ...baseRun,
      steps: [
        {
          id: "step-1",
          stepKey: "resolve_source",
          stepIndex: 0,
          status: "RUNNING",
          resultType: null,
          inputPayload: {},
          outputPayload: {},
          errorMessage: null,
          llmModel: null,
          tokensInput: null,
          tokensOutput: null,
          creditCost: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
    };

    const event: AgentRunEvent = {
      type: "step_completed",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: {
        stepKey: "resolve_source",
        stepIndex: 0,
        output: { transcriptText: "hello" },
      },
    };

    const next = applyAgentRunEvent(withStep, event);
    expect(next?.steps[0]?.status).toBe("COMPLETED");
    expect(next?.steps[0]?.outputPayload).toMatchObject({ transcriptText: "hello" });
  });

  it("seeds cuts from rank_segments when cut_rendered arrives before output cuts", () => {
    const withRankStep: AgentRunWithSteps = {
      ...baseRun,
      steps: [
        {
          id: "step-rank",
          stepKey: "rank_segments",
          stepIndex: 1,
          status: "COMPLETED",
          resultType: "COMPLETE",
          inputPayload: {},
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
              },
            ],
          },
          errorMessage: null,
          llmModel: null,
          tokensInput: null,
          tokensOutput: null,
          creditCost: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
    };

    const event: AgentRunEvent = {
      type: "cut_rendered",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: {
        cutId: "cut-1",
        cutFileId: "file-cut-1",
        renderedCount: 1,
        totalCuts: 1,
      },
    };

    const next = applyAgentRunEvent(withRankStep, event);
    const cuts = (next?.run.outputPayload as { cuts?: Array<{ cutFileId?: string }> })
      .cuts;

    expect(cuts).toHaveLength(1);
    expect(cuts?.[0]?.cutFileId).toBe("file-cut-1");
    expect(next?.run.outputPayload).toMatchObject({
      renderedCount: 1,
      totalCuts: 1,
    });
  });

  it("stores render counts on all_cuts_rendered", () => {
    const event: AgentRunEvent = {
      type: "all_cuts_rendered",
      runId: "run-1",
      timestamp: new Date().toISOString(),
      data: {
        renderedCount: 3,
        totalCuts: 3,
      },
    };

    const next = applyAgentRunEvent(baseRun, event);
    expect(next?.run.outputPayload).toMatchObject({
      renderedCount: 3,
      totalCuts: 3,
    });
  });
});
