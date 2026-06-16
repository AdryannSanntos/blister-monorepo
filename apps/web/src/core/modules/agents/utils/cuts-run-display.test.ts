import type { AgentRunStatusDto, AgentRunStepDto, CutOutput } from "@company-os/types";
import { describe, expect, it } from "vitest";

import {
  countApprovedCuts,
  cutsContentFingerprint,
  extractCutsFromRun,
  extractCutsFromRunDto,
  getRunSourceTitle,
  readSourceFileId,
  stabilizeCutsSnapshot,
} from "./cuts-run-display";

const baseCut = {
  id: "cut-1",
  title: "Hook",
  description: "Strong opening",
  startSec: 10,
  endSec: 70,
  durationSec: 60,
  viralScore: 92,
  reviewStatus: "pending" as const,
};

const run = (outputPayload: Record<string, unknown>): AgentRunStatusDto => ({
  id: "run-1",
  agentId: "cuts",
  status: "COMPLETED",
  inputPayload: { sourceFileId: "file-1" },
  outputPayload,
  reviewStatus: "PENDING",
  creditCost: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const step = (
  stepKey: string,
  outputPayload: Record<string, unknown>,
): AgentRunStepDto => ({
  id: `${stepKey}-step`,
  stepKey,
  stepIndex: 0,
  status: "COMPLETED",
  outputPayload,
});

describe("extractCutsFromRun", () => {
  it("prefers finalized run outputPayload", () => {
    const cuts = extractCutsFromRun({
      run: run({ cuts: [baseCut] }),
      steps: [step("rank_segments", { cuts: [{ ...baseCut, id: "cut-9" }] })],
    });

    expect(cuts).toHaveLength(1);
    expect(cuts[0]?.id).toBe("cut-1");
  });

  it("falls back to render_cuts step output", () => {
    const cuts = extractCutsFromRun({
      run: run({}),
      steps: [
        step("render_cuts", {
          cuts: [{ ...baseCut, cutFileId: "file-cut-1" }],
        }),
      ],
    });

    expect(cuts[0]?.cutFileId).toBe("file-cut-1");
  });

  it("falls back to rank_segments step output when paused", () => {
    const cuts = extractCutsFromRun({
      run: run({ cuts: [{ ...baseCut, title: "Paused output" }] }),
      steps: [step("rank_segments", { cuts: [baseCut] })],
    });

    expect(cuts[0]?.title).toBe("Paused output");
  });

  it("extractCutsFromRunDto reads output only", () => {
    const cuts = extractCutsFromRunDto(run({ cuts: [baseCut] }));
    expect(cuts).toHaveLength(1);
  });

  it("reads cuts from a real, step-accumulated outputPayload blob", () => {
    // Completed runs persist a merged payload where `cuts` sits alongside
    // transcript/segment/context keys. Extraction must still surface them.
    const cuts = extractCutsFromRunDto(
      run({
        cuts: [
          {
            id: "cut-1",
            title: "O Bloqueio do Claude nos EUA",
            description: "Uma análise sobre as restrições.",
            startSec: 0,
            endSec: 60,
            durationSec: 60,
            viralScore: 85,
            reviewStatus: "approved",
            cutFileId: "cmqcwiswh0017",
          },
        ],
        transcriptText: "Model in Ganondo...",
        analyzedSegments: [{ id: "seg-1", startSec: 0, endSec: 0 }],
        sourceFileId: "file-1",
        reviewStatus: "PENDING",
        hasBrandContext: false,
      }),
    );

    expect(cuts).toHaveLength(1);
    expect(cuts[0]?.title).toBe("O Bloqueio do Claude nos EUA");
    expect(cuts[0]?.description).toBe("Uma análise sobre as restrições.");
    expect(cuts[0]?.viralScore).toBe(85);
    expect(cuts[0]?.cutFileId).toBe("cmqcwiswh0017");
  });
});

describe("stabilizeCutsSnapshot", () => {
  it("reuses the previous array when fingerprint is unchanged", () => {
    const stableRef = { current: [] as CutOutput[] };
    const fingerprintRef = { current: "" };
    const first = stabilizeCutsSnapshot([baseCut], stableRef, fingerprintRef);
    const second = stabilizeCutsSnapshot(
      [{ ...baseCut }],
      stableRef,
      fingerprintRef,
    );

    expect(second).toBe(first);
    expect(cutsContentFingerprint([baseCut])).toBeTruthy();
  });

  it("returns a new array when cutFileId appears", () => {
    const stableRef = { current: [] as CutOutput[] };
    const fingerprintRef = { current: "" };
    const first = stabilizeCutsSnapshot([baseCut], stableRef, fingerprintRef);
    const second = stabilizeCutsSnapshot(
      [{ ...baseCut, cutFileId: "file-clip-1" }],
      stableRef,
      fingerprintRef,
    );

    expect(second).not.toBe(first);
    expect(second[0]?.cutFileId).toBe("file-clip-1");
  });
});

describe("run display helpers", () => {
  it("countApprovedCuts counts only approved cuts", () => {
    expect(
      countApprovedCuts([
        { ...baseCut, id: "a", reviewStatus: "approved" },
        { ...baseCut, id: "b", reviewStatus: "rejected" },
        { ...baseCut, id: "c", reviewStatus: "approved" },
        { ...baseCut, id: "d", reviewStatus: "pending" },
      ]),
    ).toBe(2);
  });

  it("getRunSourceTitle returns the trimmed userInput or an em dash", () => {
    expect(getRunSourceTitle({ userInput: "  podcast.mp4 " })).toBe(
      "podcast.mp4",
    );
    expect(getRunSourceTitle({ userInput: "   " })).toBe("—");
    expect(getRunSourceTitle({})).toBe("—");
  });

  it("readSourceFileId reads top-level and nested metadata", () => {
    expect(readSourceFileId({ sourceFileId: "file-top" })).toBe("file-top");
    expect(
      readSourceFileId({ metadata: { sourceFileId: "file-nested" } }),
    ).toBe("file-nested");
    expect(readSourceFileId({})).toBeNull();
  });
});
